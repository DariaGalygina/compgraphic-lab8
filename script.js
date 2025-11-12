class Point3D {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }
    
    subtract(other) {
        return new Point3D(this.x - other.x, this.y - other.y, this.z - other.z);
    }
    
    cross(other) {
        return new Point3D(
            this.y * other.z - this.z * other.y,
            this.z * other.x - this.x * other.z,
            this.x * other.y - this.y * other.x
        );
    }
    
    dot(other) {
        return this.x * other.x + this.y * other.y + this.z * other.z;
    }
    
    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }
    
    normalize() {
        const len = this.length();
        return len > 0 ? new Point3D(this.x/len, this.y/len, this.z/len) : this;
    }
}

class Face {
    constructor(vertexIndices, color = null) {
        this.vertexIndices = vertexIndices;
        this.color = color || `hsl(${Math.random() * 360}, 70%, 60%)`;
        this.normal = new Point3D(0, 0, 0);
        this.center = new Point3D(0, 0, 0);
    }
    
    calculateNormal(vertices) {
        if (this.vertexIndices.length < 3) return new Point3D(0, 0, 1);
        
        const v0 = vertices[this.vertexIndices[0]];
        const v1 = vertices[this.vertexIndices[1]];
        const v2 = vertices[this.vertexIndices[2]];
        
        const vec1 = v1.subtract(v0);
        const vec2 = v2.subtract(v0);
        this.normal = vec1.cross(vec2).normalize();
        
        // Вычисляем центр грани
        let sumX = 0, sumY = 0, sumZ = 0;
        for (const idx of this.vertexIndices) {
            sumX += vertices[idx].x;
            sumY += vertices[idx].y;
            sumZ += vertices[idx].z;
        }
        this.center = new Point3D(
            sumX / this.vertexIndices.length,
            sumY / this.vertexIndices.length,
            sumZ / this.vertexIndices.length
        );
        
        return this.normal;
    }
}

class Model3D {
    constructor(vertices, faces, position = new Point3D(0, 0, 0)) {
        this.vertices = vertices;
        this.faces = faces.map(f => new Face(f));
        this.position = position;
    }
}

class Simple3DViewer {
    constructor() {
        this.canvas = document.getElementById('renderCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        this.currentModel = 'cube';
        this.isPerspective = false;
        this.backfaceCulling = true;
        this.wireframe = false;
        this.useZBuffer = true;
        
        this.rotation = { x: 0, y: 0, z: 0 };
        // Расстояние до объекта, Высота камеры, Угол вокруг объекта, Тип проекции
        this.camera = { distance: 5, height: 0, angle: 0 };
        
        // Z-буфер
        this.zBuffer = new Array(this.canvas.width * this.canvas.height);
        
        this.models = this.createModels();
        this.setupEventListeners();
        
        this.lastTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        
        this.render();
    }
    
    createModels() {
        // Куб с правильными нормалями (направленными наружу)
        const cubeVertices = [
            new Point3D(-1, -1, -1), new Point3D(1, -1, -1), 
            new Point3D(1, 1, -1), new Point3D(-1, 1, -1),
            new Point3D(-1, -1, 1), new Point3D(1, -1, 1), 
            new Point3D(1, 1, 1), new Point3D(-1, 1, 1)
        ];
        
        // Грани с правильным порядком вершин (против часовой стрелки при взгляде снаружи)
        const cubeFaces = [
            [0, 3, 2, 1], // задняя грань
            [4, 5, 6, 7], // передняя грань
            [0, 1, 5, 4], // нижняя грань
            [2, 3, 7, 6], // верхняя грань
            [0, 4, 7, 3], // левая грань
            [1, 2, 6, 5]  // правая грань
        ];
        
        // Сфера с правильными нормалями
        const sphereVertices = [];
        const sphereFaces = [];
        const slices = 16;
        const stacks = 12;
        
        // Генерируем вершины
        for (let i = 0; i <= stacks; i++) {
            const phi = Math.PI * i / stacks;
            const sinPhi = Math.sin(phi);
            const cosPhi = Math.cos(phi);
            
            for (let j = 0; j <= slices; j++) {
                const theta = 2 * Math.PI * j / slices;
                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);
                
                sphereVertices.push(new Point3D(
                    sinPhi * cosTheta,
                    cosPhi,
                    sinPhi * sinTheta
                ));
            }
        }
        
        // Генерируем грани с правильным порядком вершин
        for (let i = 0; i < stacks; i++) {
            for (let j = 0; j < slices; j++) {
                const first = i * (slices + 1) + j;
                const second = first + 1;
                const third = (i + 1) * (slices + 1) + j;
                const fourth = third + 1;
                
                // Два треугольника для каждого квадрата с правильным порядком
                if (i > 0) {
                    // Первый треугольник
                    sphereFaces.push([first, third, fourth]);
                    // Второй треугольник
                    sphereFaces.push([first, fourth, second]);
                }
            }
        }
        
        // Тетраэдр с правильными нормалями
        const tetraVertices = [
            new Point3D(0, 1, 0),      // вершина
            new Point3D(0.87, -0.5, 0), // основание
            new Point3D(-0.87, -0.5, 0), 
            new Point3D(0, 0, 1.41)
        ];
        
        // Грани с правильным порядком вершин
        const tetraFaces = [
            [0, 2, 1], // основание
            [0, 1, 3], // грань 1
            [0, 3, 2], // грань 2
            [1, 2, 3]  // грань 3
        ];
        
        // Пирамида с правильными нормалями
        const pyramidVertices = [
            new Point3D(0, 1, 0),      // вершина
            new Point3D(-1, -1, -1),   // основание
            new Point3D(1, -1, -1), 
            new Point3D(1, -1, 1),
            new Point3D(-1, -1, 1)
        ];
        
        // Грани с правильным порядком вершин
        const pyramidFaces = [
            [0, 1, 2], // передняя грань
            [0, 2, 3], // правая грань
            [0, 3, 4], // задняя грань
            [0, 4, 1], // левая грань
            [1, 4, 3, 2] // основание
        ];
        
        // Несколько объектов для демонстрации Z-буфера
        const cube1 = new Model3D(cubeVertices, cubeFaces, new Point3D(-2, 0, 0));
        const cube2 = new Model3D(cubeVertices, cubeFaces, new Point3D(2, 0, 0));
        const pyramid = new Model3D(pyramidVertices, pyramidFaces, new Point3D(0, 0, 2));
        
        return {
            cube: new Model3D(cubeVertices, cubeFaces),
            sphere: new Model3D(sphereVertices, sphereFaces),
            tetrahedron: new Model3D(tetraVertices, tetraFaces),
            pyramid: new Model3D(pyramidVertices, pyramidFaces),
            multiple: {
                models: [cube1, cube2, pyramid],
                vertices: [...cube1.vertices, ...cube2.vertices, ...pyramid.vertices],
                faces: [...cube1.faces, ...cube2.faces, ...pyramid.faces]
            }
        };
    }
    
    setupEventListeners() {
        document.getElementById('modelSelect').addEventListener('change', (e) => {
            this.currentModel = e.target.value;
        });
        
        document.getElementById('parallelButton').addEventListener('click', () => {
            this.isPerspective = false;
            this.updateButtonState('parallelButton');
        });
        
        document.getElementById('perspectiveButton').addEventListener('click', () => {
            this.isPerspective = true;
            this.updateButtonState('perspectiveButton');
        });
        
        document.getElementById('backfaceCulling').addEventListener('change', (e) => {
            this.backfaceCulling = e.target.checked;
        });
        
        document.getElementById('wireframe').addEventListener('change', (e) => {
            this.wireframe = e.target.checked;
        });
        
        document.getElementById('zBuffer').addEventListener('change', (e) => {
            this.useZBuffer = e.target.checked;
        });
        
        // Вращение объекта
        document.getElementById('rotateX').addEventListener('input', (e) => {
            this.rotation.x = parseFloat(e.target.value) * Math.PI / 180;
            document.getElementById('rotateXValue').textContent = e.target.value + '°';
        });
        
        document.getElementById('rotateY').addEventListener('input', (e) => {
            this.rotation.y = parseFloat(e.target.value) * Math.PI / 180;
            document.getElementById('rotateYValue').textContent = e.target.value + '°';
        });
        
        document.getElementById('rotateZ').addEventListener('input', (e) => {
            this.rotation.z = parseFloat(e.target.value) * Math.PI / 180;
            document.getElementById('rotateZValue').textContent = e.target.value + '°';
        });
        
        // Камера
        document.getElementById('camDistance').addEventListener('input', (e) => {
            this.camera.distance = parseFloat(e.target.value);
            document.getElementById('camDistanceValue').textContent = e.target.value;
        });
        
        document.getElementById('camHeight').addEventListener('input', (e) => {
            this.camera.height = parseFloat(e.target.value);
            document.getElementById('camHeightValue').textContent = e.target.value;
        });
        
        document.getElementById('camRotate').addEventListener('input', (e) => {
            this.camera.angle = parseFloat(e.target.value) * Math.PI / 180;
            document.getElementById('camRotateValue').textContent = e.target.value + '°';
        });
    }
    
    updateButtonState(activeId) {
        document.querySelectorAll('.controls-panel button').forEach(btn => {
            btn.classList.remove('active-button');
        });
        document.getElementById(activeId).classList.add('active-button');
    }
    
    // Камера движется по окружности вокруг начала координат на расстоянии
    getCameraPosition() {
        return new Point3D(
            Math.sin(this.camera.angle) * this.camera.distance,
            this.camera.height,
            Math.cos(this.camera.angle) * this.camera.distance
        );
    }
    
    rotatePoint(point, rx, ry, rz) {
        let x = point.x, y = point.y, z = point.z;
        
        // Вращение вокруг X
        if (rx !== 0) {
            const cosX = Math.cos(rx);
            const sinX = Math.sin(rx);
            const newY = y * cosX - z * sinX;
            const newZ = y * sinX + z * cosX;
            y = newY;
            z = newZ;
        }
        
        // Вращение вокруг Y
        if (ry !== 0) {
            const cosY = Math.cos(ry);
            const sinY = Math.sin(ry);
            const newX = x * cosY + z * sinY;
            const newZ = -x * sinY + z * cosY;
            x = newX;
            z = newZ;
        }
        
        // Вращение вокруг Z
        if (rz !== 0) {
            const cosZ = Math.cos(rz);
            const sinZ = Math.sin(rz);
            const newX = x * cosZ - y * sinZ;
            const newY = x * sinZ + y * cosZ;
            x = newX;
            y = newY;
        }
        
        return new Point3D(x, y, z);
    }
    
    // Матрица проекции
    projectPoint(point) {
        const camPos = this.getCameraPosition();
        
        // Смещаем точку относительно камеры
        const dx = point.x - camPos.x;
        const dy = point.y - camPos.y;
        const dz = point.z - camPos.z;
        
        if (this.isPerspective) {
            // Перспективная проекция
            // dz - расстояние от камеры до объекта
            // Чем ДАЛЬШЕ объект → тем БОЛЬШЕ dz → тем МЕНЬШЕ scale
            const fov = 500;
            const scale = fov / Math.max(dz, 0.1);
            return {
                x: dx * scale + this.canvas.width / 2,
                y: -dy * scale + this.canvas.height / 2,
                z: dz
            };
        } else {
            // Параллельная проекция
            const scale = 80;
            return {
                x: dx * scale + this.canvas.width / 2,
                y: -dy * scale + this.canvas.height / 2,
                z: dz
            };
        }
    }
    
    isFaceVisible(face, transformedVertices) {
        if (!this.backfaceCulling) return true;
        
        const normal = face.calculateNormal(transformedVertices);
        const cameraPos = this.getCameraPosition();
        
        // Вектор от центра грани к камере
        const viewVector = new Point3D(
            cameraPos.x - face.center.x,
            cameraPos.y - face.center.y,
            cameraPos.z - face.center.z
        ).normalize();
        
        // Грань видима, если нормаль направлена в сторону камеры
        // (угол между нормалью и вектором к камере меньше 90 градусов)
        return normal.dot(viewVector) > 0;
    }
    
    clearZBuffer() {
        for (let i = 0; i < this.zBuffer.length; i++) {
            this.zBuffer[i] = Number.MAX_VALUE;
        }
    }
    
    drawTriangle(x1, y1, z1, x2, y2, z2, x3, y3, z3, color) {
        // Простая реализация заливки треугольника с Z-буфером
        const minX = Math.max(0, Math.floor(Math.min(x1, x2, x3)));
        const maxX = Math.min(this.canvas.width - 1, Math.ceil(Math.max(x1, x2, x3)));
        const minY = Math.max(0, Math.floor(Math.min(y1, y2, y3)));
        const maxY = Math.min(this.canvas.height - 1, Math.ceil(Math.max(y1, y2, y3)));
        
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                // Барицентрические координаты
                const denom = (y2 - y3) * (x1 - x3) + (x3 - x2) * (y1 - y3);
                if (Math.abs(denom) < 0.0001) continue;
                
                const lambda1 = ((y2 - y3) * (x - x3) + (x3 - x2) * (y - y3)) / denom;
                const lambda2 = ((y3 - y1) * (x - x3) + (x1 - x3) * (y - y3)) / denom;
                const lambda3 = 1 - lambda1 - lambda2;
                
                if (lambda1 >= 0 && lambda2 >= 0 && lambda3 >= 0) {
                    const z = lambda1 * z1 + lambda2 * z2 + lambda3 * z3;
                    const bufferIndex = y * this.canvas.width + x;
                    
                    if (z < this.zBuffer[bufferIndex] && z > 0) {
                        this.zBuffer[bufferIndex] = z;
                        this.ctx.fillStyle = color;
                        this.ctx.fillRect(x, y, 1, 1);
                    }
                }
            }
        }
    }
    
    drawFace(face, projectedPoints, faceColor) {
        if (projectedPoints.length < 3) return;
        
        if (this.useZBuffer && !this.wireframe) {
            // Разбиваем грань на треугольники для Z-буфера
            if (projectedPoints.length === 3) {
                const p0 = projectedPoints[0];
                const p1 = projectedPoints[1];
                const p2 = projectedPoints[2];
                this.drawTriangle(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, faceColor);
            } else if (projectedPoints.length === 4) {
                // Для четырехугольника - два треугольника
                const p0 = projectedPoints[0];
                const p1 = projectedPoints[1];
                const p2 = projectedPoints[2];
                const p3 = projectedPoints[3];
                
                this.drawTriangle(p0.x, p0.y, p0.z, p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, faceColor);
                this.drawTriangle(p0.x, p0.y, p0.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z, faceColor);
            }
        } else {
            if (this.wireframe) {
                this.ctx.strokeStyle = '#ffffff';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                projectedPoints.forEach((p, i) => {
                    if (i === 0) this.ctx.moveTo(p.x, p.y);
                    else this.ctx.lineTo(p.x, p.y);
                });
                this.ctx.closePath();
                this.ctx.stroke();
            } else {
                this.ctx.fillStyle = faceColor;
                this.ctx.beginPath();
                projectedPoints.forEach((p, i) => {
                    if (i === 0) this.ctx.moveTo(p.x, p.y);
                    else this.ctx.lineTo(p.x, p.y);
                });
                this.ctx.closePath();
                this.ctx.fill();
                
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
            }
        }
    }
    
    render() {
        const currentTime = performance.now();
        if (currentTime - this.lastTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastTime = currentTime;
            document.getElementById('fpsCounter').textContent = this.fps;
        }
        this.frameCount++;
        
        // Очистка
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Очистка Z-буфера
        if (this.useZBuffer) {
            this.clearZBuffer();
        }
        
        let modelsToRender = [];
        let totalFaces = 0;
        let totalVertices = 0;
        
        if (this.currentModel === 'multiple') {
            modelsToRender = this.models.multiple.models;
            totalFaces = this.models.multiple.faces.length;
            totalVertices = this.models.multiple.vertices.length;
        } else {
            modelsToRender = [this.models[this.currentModel]];
            totalFaces = this.models[this.currentModel].faces.length;
            totalVertices = this.models[this.currentModel].vertices.length;
        }
        
        document.getElementById('faceCount').textContent = totalFaces;
        document.getElementById('vertexCount').textContent = totalVertices;
        
        // Отрисовка всех моделей
        modelsToRender.forEach(model => {
            // Преобразование вершин с учетом позиции модели
            const transformedVertices = model.vertices.map(v => {
                const rotated = this.rotatePoint(v, this.rotation.x, this.rotation.y, this.rotation.z);
                return new Point3D(
                    rotated.x + model.position.x,
                    rotated.y + model.position.y,
                    rotated.z + model.position.z
                );
            });
            
            // Проекция вершин
            const projectedVertices = transformedVertices.map(v => 
                this.projectPoint(v)
            );
            
            // Отрисовка граней
            model.faces.forEach(face => {
                if (!this.isFaceVisible(face, transformedVertices)) {
                    return;
                }
                
                const points = face.vertexIndices.map(idx => projectedVertices[idx]);
                
                // Проверка что все точки перед камерой
                if (points.some(p => p.z <= 0.1)) return;
                
                this.drawFace(face, points, face.color);
            });
        });
        
        requestAnimationFrame(() => this.render());
    }
}

// Запуск
window.addEventListener('load', () => {
    new Simple3DViewer();
});