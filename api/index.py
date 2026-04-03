import os
import json
import subprocess
import threading
import time
import sys
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
from pathlib import Path

app = Flask(__name__)
CORS(app, origins=['http://localhost:3000', 'http://127.0.0.1:3000'])

# Configuration
BOT_DIR = Path(__file__).parent.parent / "my-bot"
TOKEN_FILE = BOT_DIR / "amine_token.txt"
LOG_BUFFER = []
LOG_LOCK = threading.Lock()
bot_process = None
process_lock = threading.Lock()

BOT_DIR.mkdir(exist_ok=True)

def add_log(message, log_type="INFO"):
    timestamp = time.strftime("%H:%M:%S")
    colored_logs = {
        "INFO": "\033[36m[INFO]\033[0m",
        "SUCCESS": "\033[32m[SUCCESS]\033[0m",
        "ERROR": "\033[31m[ERROR]\033[0m",
        "WARNING": "\033[33m[WARNING]\033[0m",
        "BOT": "\033[35m[BOT]\033[0m",
        "SYSTEM": "\033[34m[SYSTEM]\033[0m",
    }
    
    colored = colored_logs.get(log_type, f"[{log_type}]")
    console_msg = f"[{timestamp}] {colored} {message}"
    
    with LOG_LOCK:
        LOG_BUFFER.append({
            "timestamp": timestamp,
            "type": log_type,
            "message": message,
            "raw": f"[{timestamp}] [{log_type}] {message}"
        })
        if len(LOG_BUFFER) > 1000:
            LOG_BUFFER.pop(0)
    
    print(console_msg)
    sys.stdout.flush()

def read_process_output(pipe, is_error=False):
    for line in iter(pipe.readline, ''):
        if line.strip():
            log_type = "ERROR" if is_error else "BOT"
            add_log(line.strip(), log_type)

@app.route('/api/bot', methods=['GET', 'POST', 'OPTIONS'])
def bot_handler():
    global bot_process
    
    if request.method == 'OPTIONS':
        response = Response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        return response
    
    if request.method == 'GET':
        action = request.args.get('action')
        
        if action == 'stream_logs':
            def generate():
                last_index = 0
                while True:
                    with LOG_LOCK:
                        if last_index < len(LOG_BUFFER):
                            for log in LOG_BUFFER[last_index:]:
                                yield f"data: {json.dumps(log)}\n\n"
                            last_index = len(LOG_BUFFER)
                    
                    if bot_process and bot_process.poll() is not None:
                        yield f"data: {json.dumps({'type': 'SYSTEM', 'message': 'Bot process completed'})}\n\n"
                        break
                    
                    time.sleep(0.3)
            
            return Response(stream_with_context(generate()), 
                          mimetype='text/event-stream',
                          headers={
                              'Cache-Control': 'no-cache',
                              'Access-Control-Allow-Origin': '*'
                          })
        
        return jsonify({"status": "ok", "message": "Bot API is running"})
    
    elif request.method == 'POST':
        data = request.get_json()
        action = data.get('action')
        
        if action == 'save_credentials':
            guest_id = data.get('guest_id')
            guest_password = data.get('guest_password')
            
            if not guest_id or not guest_password:
                return jsonify({"error": "Missing credentials"}), 400
            
            token_data = {guest_id: guest_password}
            with open(TOKEN_FILE, 'w') as f:
                json.dump(token_data, f)
            
            add_log(f"Credentials saved for ID: {guest_id}", "SUCCESS")
            return jsonify({"status": "success", "message": "Credentials saved"})
        
        elif action == 'start_bot':
            with process_lock:
                if bot_process and bot_process.poll() is None:
                    return jsonify({"error": "Bot already running"}), 400
                
                if not TOKEN_FILE.exists():
                    return jsonify({"error": "No credentials found"}), 400
            
            try:
                add_log("=" * 50, "SYSTEM")
                add_log("STARTING BOT PROCESS", "SUCCESS")
                add_log("=" * 50, "SYSTEM")
                
                bot_process = subprocess.Popen(
                    [sys.executable, str(BOT_DIR / "main.py")],
                    cwd=str(BOT_DIR),
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    bufsize=1,
                    universal_newlines=True
                )
                
                threading.Thread(target=read_process_output, args=(bot_process.stdout, False), daemon=True).start()
                threading.Thread(target=read_process_output, args=(bot_process.stderr, True), daemon=True).start()
                
                add_log("Bot process started successfully", "SUCCESS")
                return jsonify({"status": "success", "message": "Bot started"})
            
            except Exception as e:
                add_log(f"Failed to start bot: {str(e)}", "ERROR")
                return jsonify({"error": str(e)}), 500
        
        elif action == 'stop_bot':
            with process_lock:
                if bot_process and bot_process.poll() is None:
                    bot_process.terminate()
                    bot_process.wait(timeout=5)
                    add_log("Bot stopped by user", "WARNING")
                    return jsonify({"status": "success", "message": "Bot stopped"})
                else:
                    return jsonify({"status": "info", "message": "No bot running"})
        
        elif action == 'clear_logs':
            with LOG_LOCK:
                LOG_BUFFER.clear()
            add_log("Terminal cleared", "SYSTEM")
            return jsonify({"status": "success", "message": "Logs cleared"})
        
        return jsonify({"error": "Invalid action"}), 400

@app.route('/api/bot/status', methods=['GET'])
def bot_status():
    global bot_process
    is_running = bot_process and bot_process.poll() is None
    return jsonify({
        "running": is_running,
        "pid": bot_process.pid if bot_process and is_running else None
    })

if __name__ == '__main__':
    print("\n" + "="*50)
    print("🤖 RAGNAR BOT API SERVER")
    print("="*50)
    print(f"📍 Bot Directory: {BOT_DIR}")
    print(f"📝 Token File: {TOKEN_FILE}")
    print(f"🚀 Server running on http://localhost:5000")
    print("="*50 + "\n")
    app.run(debug=True, port=5000, host='0.0.0.0', use_reloader=False)