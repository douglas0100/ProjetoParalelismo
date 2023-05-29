const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

const port = 3000;

// Configurar rota para servir o arquivo index.html
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Adicione abaixo do código `const io = socketIO(server);`
const players = {};
let fruits = []; // Array para armazenar as frutas

// Função para gerar uma posição aleatória para a fruta
function generateRandomFruitPosition() {
    const grid = 16; // Tamanho do grid da cobra (mesmo valor utilizado no cliente)
    const position = {
        x: Math.floor(Math.random() * 40) * grid,
        y: Math.floor(Math.random() * 40) * grid
    };
    return position;
}

// Função para criar uma nova fruta
function createFruit() {
    const fruit = generateRandomFruitPosition();

    // Cores disponíveis para as frutas
    const colors = ['red', 'green', 'yellow', 'orange'];

    // Escolher uma cor aleatória
    const randomColor = colors[Math.floor(Math.random() * colors.length)];

    // Adicionar a cor à fruta
    fruit.color = randomColor;

    fruits.push(fruit);
    io.emit('fruits', fruits); // Emitir as frutas para todos os jogadores
}

// Função para verificar colisão com o próprio corpo da cobra
function checkCollisionWithBody(player) {
    const snake = player.snake;
    const head = snake.cells[0];

    for (let i = 1; i < snake.cells.length; i++) {
        const cell = snake.cells[i];
        if (head.x === cell.x && head.y === cell.y) {
            // Colisão com o próprio corpo, reiniciar tamanho da cobra
            snake.cells = [];
            snake.maxCells = 4;
            break;
        }
    }
}

// Função para verificar colisão com as frutas
function checkCollisionWithFruits(player) {
    const snake = player.snake;
    const head = snake.cells[0];

    fruits.forEach((fruit, index) => {
        if (head.x === fruit.x && head.y === fruit.y) {
            snake.maxCells++; // Aumentar o tamanho da cobra
            fruits.splice(index, 1); // Remover a fruta do array de frutas
        }
    });
}

// Função para lidar com eventos de conexão
function handleConnection(socket) {
    socket.on('newPlayer', () => {
        players[socket.id] = {
            snake: {
                x: 160,
                y: 160,
                dx: 16,
                dy: 0,
                cells: [],
                maxCells: 4
            }
        };
        socket.emit('fruits', fruits); // Enviar as frutas existentes para o novo jogador
    });

    socket.on('updateDirection', (direction) => {
        players[socket.id].snake.dx = direction.dx;
        players[socket.id].snake.dy = direction.dy;
    });

    socket.on('disconnect', () => {
        delete players[socket.id];
    });
}

// Função para atualizar o estado do jogo
function updateGameState() {
    for (let playerId in players) {
        let player = players[playerId];
        let snake = player.snake;

        snake.x += snake.dx;
        snake.y += snake.dy;

        if (snake.x < 0) {
            snake.x = 640 - 16;
        } else if (snake.x >= 640) {
            snake.x = 0;
        }

        if (snake.y < 0) {
            snake.y = 640 - 16;
        } else if (snake.y >= 640) {
            snake.y = 0;
        }

        snake.cells.unshift({ x: snake.x, y: snake.y });

        if (snake.cells.length > snake.maxCells) {
            snake.cells.pop();
        }

        // Verificar colisão com as frutas
        checkCollisionWithFruits(player);

        // Verificar colisão com o próprio corpo
        checkCollisionWithBody(player);
    }

    // Gerar uma nova fruta se não houver frutas no momento
    if (fruits.length === 0) {
        createFruit();
    }

    io.emit('state', players);
    io.emit('fruits', fruits); // Emitir as frutas atualizadas para todos os jogadores
}

io.on('connection', handleConnection);

setInterval(updateGameState, 1000 / 15);

server.listen(port, () => {
    console.log(`Servidor escutando na porta ${port}`);
});
