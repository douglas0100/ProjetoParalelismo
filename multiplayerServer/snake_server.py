import eventlet
import socketio

# Configuração básica
sio = socketio.Server()
app = socketio.WSGIApp(sio)

# Dicionário para armazenar as posições dos jogadores
players = {}

# Evento de conexão de um jogador
@sio.event
def connect(sid, environ):
    print('Novo jogador conectado:', sid)
    players[sid] = {
        'x': 160,
        'y': 160,
        'dx': 16,
        'dy': 0,
        'cells': [],
        'maxCells': 4
    }

# Evento de desconexão de um jogador
@sio.event
def disconnect(sid):
    print('Jogador desconectado:', sid)
    if sid in players:
        del players[sid]

# Evento de movimento do jogador
@sio.event
def move(sid, direction):
    player = players.get(sid)
    if player:
        if direction == 'up' and player['dy'] == 0:
            player['dx'] = 0
            player['dy'] = -16
        elif direction == 'down' and player['dy'] == 0:
            player['dx'] = 0
            player['dy'] = 16
        elif direction == 'left' and player['dx'] == 0:
            player['dx'] = -16
            player['dy'] = 0
        elif direction == 'right' and player['dx'] == 0:
            player['dx'] = 16
            player['dy'] = 0

# Função para atualizar a posição da cobrinha de um jogador
def update_player_position(player):
    player['x'] += player['dx']
    player['y'] += player['dy']

    if player['x'] < 0:
        player['x'] = 640 - 16
    elif player['x'] >= 640:
        player['x'] = 0

    if player['y'] < 0:
        player['y'] = 640 - 16
    elif player['y'] >= 640:
        player['y'] = 0

    player['cells'].insert(0, {'x': player['x'], 'y': player['y']})

    if len(player['cells']) > player['maxCells']:
        player['cells'].pop()

# Função para verificar colisão da cobrinha com a maçã ou com outras cobrinhas
def check_collision(player):
    head = player['cells'][0]

    for pid, p in players.items():
        if pid != player['sid']:
            if head in p['cells']:
                return True

    return False

# Função para enviar atualizações para todos os jogadores
def send_updates():
    for sid, player in players.items():
        sio.emit('update', {
            'sid': sid,
            'cells': player['cells']
        })

# Loop principal do jogo
def game_loop():
    while True:
        eventlet.sleep(0.1)

        for sid, player in players.items():
            update_player_position(player)

            if check_collision(player):
                player['x'] = 160
                player['y'] = 160
                player['cells'] = []
                player['maxCells'] = 4
                player['dx'] = 16
                player['dy'] = 0

        send_updates()

# Executa o servidor na porta 5000
if __name__ == '__main__':
    eventlet.spawn(game_loop)
    eventlet.wsgi.server(eventlet.listen(('', 5000)), app)