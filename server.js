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

function generateRandomFruitPosition() {
    const grid = 16; // Tamanho do grid da cobra (mesmo valor utilizado no cliente)
    const position = {
        x: Math.floor(Math.random() * 40) * grid,
        y: Math.floor(Math.random() * 40) * grid
    };
    return position;
}

function createFruit() {
    const fruit = generateRandomFruitPosition();
    fruits.push(fruit);
    io.emit('fruits', fruits); // Emitir as frutas para todos os jogadores
}

io.on('connection', (socket) => {
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
});

setInterval(() => {
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
        fruits.forEach((fruit, index) => {
            if (snake.x === fruit.x && snake.y === fruit.y) {
                snake.maxCells++; // Aumentar o tamanho da cobra
                fruits.splice(index, 1); // Remover a fruta do array de frutas
            }
        });
    }

    // Gerar uma nova fruta se não houver frutas no momento
    if (fruits.length === 0) {
        createFruit();
    }

    io.emit('state', players);
    io.emit('fruits', fruits); // Emitir as frutas atualizadas para todos os jogadores
}, 1000 / 15);

server.listen(port, () => {
    console.log(`Servidor escutando na porta ${port}`);
});
