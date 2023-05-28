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

function generateRandomFruitPosition() {
    var position = {
        x: Math.floor(Math.random() * 40) * grid,
        y: Math.floor(Math.random() * 40) * grid
    };
    return position;
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


    }

    io.emit('state', players);
}, 1000 / 15);

server.listen(port, () => {
    console.log(`Servidor escutando na porta ${port}`);
});
