from flask import Flask, request, jsonify, session, send_file
from game_logic_27triple import Game, card_to_str, card_to_img_url
from flask_cors import CORS
import os

app = Flask(__name__)
CORS(app)
app.secret_key = os.environ.get('SECRET_KEY', 'dev-secret-change-in-production')
games = {}  # 単純にメモリで保持

def serialize_state(game: Game):
    return {
        'pot': game.pot,
        'player_stack': game.player_stack,
        'cpu_stack': game.cpu_stack,
        'street': game.street,  # 0..3
        'turn_draw': game.turn,  # 0..2 ドロー回数
        'to_act': game.to_act,
        'betting_open': game.betting_open,
        'draw_phase': game.draw_phase,
        'hand_over': game.hand_over,
        'current_bet': game.current_bet,
        'player_contrib': game.player_contrib,
        'cpu_contrib': game.cpu_contrib,
        'legal_actions': game.legal_actions_for_player(),
        'cpu_last_action': game.cpu_last_action,
        'last_payout': game.last_payout,
    }

@app.route('/')
def index():
    # Vercel環境では絶対パスを使用
    html_path = os.path.join(os.path.dirname(__file__), 'templates_27triple.html')
    return send_file(html_path)

@app.route('/start', methods=['POST'])
def start_game():
    # 直前ゲームがあればスタックを引き継ぎ
    prev_game = games.get(session.get('game_id'))
    if prev_game:
        pstack = prev_game.player_stack
        cstack = prev_game.cpu_stack
    else:
        pstack = 100
        cstack = 100
    game = Game(player_stack=pstack, cpu_stack=cstack)
    session['game_id'] = id(game)
    games[id(game)] = game
    return jsonify({
        'player_hand': [{'text': card_to_str(c), 'img': card_to_img_url(c)} for c in game.player.cards],
        'state': serialize_state(game)
    })

@app.route('/action', methods=['POST'])
def action():
    data = request.json
    act = data.get('action')  # 'fold' | 'check' | 'call' | 'bet' | 'raise'
    game = games.get(session.get('game_id'))
    if not game or not game.betting_open or game.hand_over:
        return jsonify({'error': 'invalid state'}), 400
    if act not in ['fold','check','call','bet','raise']:
        return jsonify({'error': 'invalid action'}), 400
    game.player_action(act)
    return jsonify({
        'player_hand': [{'text': card_to_str(c), 'img': card_to_img_url(c)} for c in game.player.cards],
        'state': serialize_state(game)
    })

@app.route('/discard', methods=['POST'])
def discard():
    data = request.json
    keep_indexes = data.get('keep_indexes', [])
    game = games.get(session.get('game_id'))
    if not game or game.hand_over:
        return jsonify({'error': 'invalid game'}), 400
    if not game.draw_phase:
        return jsonify({'error': 'not draw phase'}), 400
    game.player_discard(keep_indexes)
    game.cpu_discard()
    # 次ストリートへ
    game.after_both_discard_advance()
    # 次ストリートの先手はCPU。CPUの番なら自動進行を回しておく
    if game.to_act == 'cpu' and game.betting_open and not game.hand_over:
        game.cpu_auto_progress()
    return jsonify({
        'player_hand': [{'text': card_to_str(c), 'img': card_to_img_url(c)} for c in game.player.cards],
        'state': serialize_state(game)
    })

@app.route('/showdown', methods=['POST'])
def showdown():
    game = games.get(session.get('game_id'))
    if not game:
        return jsonify({'error': 'invalid game'}), 400
    result, player_cards, cpu_cards = game.showdown()
    return jsonify({
        'result': result,
        'player_hand': [{'text': card_to_str(c), 'img': card_to_img_url(c)} for c in player_cards],
        'cpu_hand': [{'text': card_to_str(c), 'img': card_to_img_url(c)} for c in cpu_cards],
        'state': serialize_state(game)
    })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)

