// 🎯 기본 로드할 파일 경로 (서버 시작 시 자동 로드)
const path = require('path');
const FOLDER_PATH = path.resolve('C:/git/v3/v3/src/rodi/code/plugins.debug/PID_Tuning_for_AMC_2/htmlStore');
const FILE_Name = 'PIDTuningWidgetNode.html';
const DEFAULT_FILE = path.join(FOLDER_PATH, FILE_Name);

//const DEFAULT_FILE = 'C:\git\v3\v3\src\rodi\code\plugins.debug\PID_Tuning_for_AMC_2\htmlStore\PIDTuningWidgetNode.html';

/**
 * Rodi-X HTML Preview Server
 * 실시간 HTML 파일 미리보기 서버 for Rodi-X 개발
 *
 * 기능:
 * - Rodi-X 커스텀 컴포넌트를 표준 HTML로 변환
 * - 파일 변경 감지 및 실시간 브라우저 리로드
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const chokidar = require('chokidar');
const fs = require('fs');
const RodiConverter = require('./rodiConverter-simple');

// ==========================================
// 서버 설정
// ==========================================
const PORT = 3000;
const converter = new RodiConverter();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ==========================================
// 파일 경로 설정
// ==========================================

// 현재 감시 중인 디렉토리와 파일
let watchDirectory = '';
let currentHtmlFile = '';


// ==========================================
// 라우트 설정
// ==========================================

/**
 * 메인 페이지 라우트 - 프리뷰 페이지
 */
app.get('/', (req, res) => {
  try {
    if (!currentHtmlFile || !fs.existsSync(currentHtmlFile)) {
      res.status(404).send(`
        <h1>❌ 파일을 찾을 수 없습니다</h1>
        <p>파일: ${currentHtmlFile || 'NOT_SET'}</p>
        <p>server.js의 DEFAULT_FILE 경로를 확인해주세요.</p>
      `);
      return;
    }

    const htmlContent = fs.readFileSync(currentHtmlFile, 'utf8');
    const convertedHtml = converter.convert(htmlContent);

    const previewHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rodi-X Preview - ${path.basename(currentHtmlFile)}</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .preview-header {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            margin: -20px -20px 20px -20px;
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        .preview-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .status {
            padding: 5px 10px;
            border-radius: 4px;
            font-size: 12px;
            margin-left: 10px;
        }
        .status.connected {
            background: #28a745;
            color: white;
        }
        .status.disconnected {
            background: #dc3545;
            color: white;
        }
        .file-info {
            font-size: 14px;
            color: #666;
            margin-bottom: 10px;
        }
    </style>
</head>
<body>
    <div class="preview-header">
        <h1>🚀 Rodi-X Live Preview</h1>
        <div class="file-info">
            📁 파일: ${currentHtmlFile}<br>
            🕒 마지막 업데이트: ${new Date().toLocaleString()}
            <span id="status" class="status connected">● 연결됨</span>
        </div>
    </div>

    <div class="preview-content">
        ${convertedHtml}
    </div>

    <script>
        const socket = io();
        const statusEl = document.getElementById('status');

        socket.on('connect', () => {
            statusEl.textContent = '● 연결됨';
            statusEl.className = 'status connected';
            console.log('🔗 서버에 연결되었습니다');
        });

        socket.on('disconnect', () => {
            statusEl.textContent = '● 연결끊김';
            statusEl.className = 'status disconnected';
            console.log('❌ 서버 연결이 끊어졌습니다');
        });

        socket.on('file-changed', (data) => {
            console.log('📝 파일이 변경되었습니다:', data.file);
            document.body.style.opacity = '0.7';
            setTimeout(() => {
                window.location.reload();
            }, 200);
        });

        // 개발용 상호작용 로깅
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                console.log('🖱️ 버튼 클릭:', e.target.textContent);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT') {
                console.log('⌨️ 입력 변화:', e.target.id, '=', e.target.value);
            }
        });
    </script>
</body>
</html>`;

    res.send(previewHtml);
  } catch (error) {
    console.error('❌ 오류:', error);
    res.status(500).send(`
        <h1>오류 발생</h1>
        <p>${error.message}</p>
    `);
  }
});

/**
 * API 라우트 - 현재 상태 확인
 */
app.get('/api/status', (req, res) => {
  res.json({
    watchDirectory,
    currentHtmlFile,
    isWatching: watcher ? true : false,
    connectedClients: io.sockets.sockets.size
  });
});

// ==========================================
// 파일 감시 시스템
// ==========================================

let watcher = null;

/**
 * 파일 감시 시작
 */
function startWatching() {
  if (watcher) {
    watcher.close();
  }

  console.log('👀 파일 감시 시작:', watchDirectory);

  watcher = chokidar.watch(path.join(watchDirectory, '*.html'), {
    ignored: /[\/\\]\./,
    persistent: true,
    ignoreInitial: true
  });

  watcher.on('change', (filepath) => {
    console.log('📝 파일 변경 감지:', filepath);

    if (filepath === currentHtmlFile) {
      io.emit('file-changed', {
        file: filepath,
        timestamp: new Date().toISOString()
      });
    }
  });

  watcher.on('error', (error) => {
    console.error('❌ 파일 감시 오류:', error);
  });
}

// ==========================================
// Socket.IO 연결 처리
// ==========================================

io.on('connection', (socket) => {
  console.log('🔗 클라이언트 연결:', socket.id);

  socket.on('disconnect', () => {
    console.log('❌ 클라이언트 연결 해제:', socket.id);
  });
});

// ==========================================
// 서버 시작
// ==========================================

server.listen(PORT, () => {
  console.log('🚀 Rodi-X Preview 서버 시작!');
  console.log(`📱 브라우저에서 http://localhost:${PORT} 접속`);

  // 설정된 기본 파일 자동 로드
  if (fs.existsSync(DEFAULT_FILE)) {
    currentHtmlFile = DEFAULT_FILE;
    watchDirectory = path.dirname(DEFAULT_FILE);
    startWatching();
    console.log(`✅ 설정된 파일 자동 로드: ${DEFAULT_FILE}`);
  } else {
    console.log(`❌ 설정된 파일을 찾을 수 없음: ${DEFAULT_FILE}`);
    console.log('📝 server.js의 DEFAULT_FILE 경로를 확인해주세요.');
  }
});

// ==========================================
// 우아한 종료
// ==========================================

process.on('SIGINT', () => {
  console.log('\n🛑 서버 종료 중...');
  if (watcher) {
    watcher.close();
  }
  server.close(() => {
    console.log('✅ 서버가 종료되었습니다');
    process.exit(0);
  });
});