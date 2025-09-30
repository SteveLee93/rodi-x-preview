// ==========================================
// 설정 및 의존성
// ==========================================
const path = require('path');
const config = require('./config');
const StyleLoader = require('./styleLoader');

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
const PORT = config.SERVER_CONFIG.port;
const converter = new RodiConverter();
const styleLoader = new StyleLoader();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, config.SERVER_CONFIG.socketIO);

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
        <p>config.js의 HTML_FOLDER와 HTML_FILE 경로를 확인해주세요.</p>
      `);
      return;
    }

    const htmlContent = fs.readFileSync(currentHtmlFile, 'utf8');
    const convertedHtml = converter.convert(htmlContent);

    // V3 프로젝트의 실제 스타일 로드
    const rodiXStyles = styleLoader.loadAllStyles();

    const previewHtml = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rodi-X Preview - ${path.basename(currentHtmlFile)}</title>
    <script src="/socket.io/socket.io.js"></script>

    <!-- V3 프로젝트의 실제 RodiX 컴포넌트 스타일 -->
    <style id="rodix-component-styles">
/* ============================================
   RodiX Component Styles from V3 Project
   경로: ${config.RODIX_COMPONENTS_DIR}
   로드된 컴포넌트: ${rodiXStyles.loaded}개
============================================ */

${rodiXStyles.styles}
    </style>

    <!-- V3 스타일 강제 적용 (사용자 HTML의 잘못된 인라인 스타일 오버라이드) -->
    <style id="v3-style-override">
/* 버튼 스타일 강제 적용 - line-height: 0px 같은 문제 해결 */
.btn {
  line-height: inherit !important;
}

/* 사용자가 추가한 잘못된 버튼 스타일 수정 - 더 높은 우선순위로 오버라이드 */
button.PID-gain-table-btn.btn {
  line-height: normal !important;
  height: auto !important;
}

.PID-gain-table-btn.btn.primary {
  line-height: normal !important;
  height: auto !important;
}
    </style>

    <!-- 프리뷰 서버 전용 스타일 (V3 컴포넌트에 영향 없음) -->
    <style id="preview-server-styles">
        /* 서버 UI만 스타일링 - .preview-content 제외 */
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }

        /* 프리뷰 헤더 */
        .preview-header {
            background: #007bff;
            color: white;
            padding: 10px 20px;
            margin: -20px -20px 20px -20px;
            position: sticky;
            top: 0;
            z-index: 1000;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        /* 프리뷰 컨텐츠 컨테이너 - V3 스타일에 영향주지 않음 */
        .preview-content {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            margin-bottom: 20px;
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
            color: rgba(255,255,255,0.9);
            margin-bottom: 10px;
        }
        .debug-toolbar {
            background: #343a40;
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
        }
        .debug-btn {
            background: #495057;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 13px;
            transition: background 0.2s;
        }
        .debug-btn:hover {
            background: #6c757d;
        }
        .debug-btn.active {
            background: #007bff;
        }
        .debug-panel {
            background: #f8f9fa;
            border: 1px solid #dee2e6;
            border-radius: 8px;
            padding: 15px;
            margin-bottom: 20px;
            display: none;
        }
        .debug-panel.show {
            display: block;
        }
        .debug-panel h3 {
            margin-top: 0;
            color: #495057;
            font-size: 16px;
        }
        .debug-panel pre {
            background: white;
            padding: 10px;
            border-radius: 4px;
            overflow: auto;
            max-height: 400px;
            font-size: 12px;
        }
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 10px;
        }
        .stat-item {
            background: white;
            padding: 10px;
            border-radius: 4px;
            border-left: 3px solid #007bff;
        }
        .stat-label {
            font-size: 12px;
            color: #6c757d;
            margin-bottom: 5px;
        }
        .stat-value {
            font-size: 20px;
            font-weight: bold;
            color: #212529;
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

    <div class="debug-toolbar">
        <span style="font-weight: bold;">🛠️ 개발 도구:</span>
        <button class="debug-btn" onclick="togglePanel('stats')">📊 통계</button>
        <button class="debug-btn" onclick="togglePanel('source')">📝 원본 HTML</button>
        <button class="debug-btn" onclick="togglePanel('converted')">✨ 변환 HTML</button>
        <button class="debug-btn" onclick="refreshPreview()">🔄 새로고침</button>
    </div>

    <div id="panel-stats" class="debug-panel">
        <h3>📊 변환 통계</h3>
        <div id="stats-content" class="stats-grid">
            <div class="stat-item">
                <div class="stat-label">총 변환 횟수</div>
                <div class="stat-value" id="stat-conversions">-</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">서버 가동 시간</div>
                <div class="stat-value" id="stat-uptime">-</div>
            </div>
            <div class="stat-item">
                <div class="stat-label">연결된 클라이언트</div>
                <div class="stat-value" id="stat-clients">-</div>
            </div>
        </div>
    </div>

    <div id="panel-source" class="debug-panel">
        <h3>📝 원본 HTML (Rodi-X 컴포넌트)</h3>
        <pre id="source-content">로딩 중...</pre>
    </div>

    <div id="panel-converted" class="debug-panel">
        <h3>✨ 변환된 HTML (표준 HTML)</h3>
        <pre id="converted-content">로딩 중...</pre>
    </div>

    <div class="preview-content">
        ${convertedHtml}
    </div>

    <script>
        const socket = io();
        const statusEl = document.getElementById('status');
        let activePanels = new Set();

        // Socket.IO 연결 관리
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

        socket.on('file-deleted', (data) => {
            alert('⚠️ 프리뷰 중인 파일이 삭제되었습니다!');
            console.error('❌ 파일 삭제:', data.file);
        });

        // 디버그 패널 토글
        function togglePanel(panelName) {
            const panel = document.getElementById('panel-' + panelName);
            const btn = event.target;

            if (activePanels.has(panelName)) {
                panel.classList.remove('show');
                btn.classList.remove('active');
                activePanels.delete(panelName);
            } else {
                panel.classList.add('show');
                btn.classList.add('active');
                activePanels.add(panelName);

                // 패널 열 때 데이터 로드
                loadPanelData(panelName);
            }
        }

        // 패널 데이터 로드
        async function loadPanelData(panelName) {
            try {
                switch(panelName) {
                    case 'stats':
                        const statsRes = await fetch('/api/status');
                        const stats = await statsRes.json();
                        document.getElementById('stat-conversions').textContent =
                            stats.converterStats.totalConversions;
                        document.getElementById('stat-uptime').textContent =
                            formatUptime(stats.uptime);
                        document.getElementById('stat-clients').textContent =
                            stats.connectedClients;
                        break;

                    case 'source':
                        const sourceRes = await fetch('/api/source');
                        const source = await sourceRes.json();
                        document.getElementById('source-content').textContent =
                            source.content;
                        break;

                    case 'converted':
                        const convertedRes = await fetch('/api/converted');
                        const converted = await convertedRes.json();
                        document.getElementById('converted-content').textContent =
                            converted.content;
                        break;
                }
            } catch (error) {
                console.error('패널 데이터 로드 오류:', error);
                alert('데이터를 불러오는데 실패했습니다: ' + error.message);
            }
        }

        // 새로고침
        function refreshPreview() {
            window.location.reload();
        }

        // 가동 시간 포맷
        function formatUptime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return \`\${hours}h \${minutes}m \${secs}s\`;
        }

        // 개발용 상호작용 로깅
        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && !e.target.classList.contains('debug-btn')) {
                console.log('🖱️ 버튼 클릭:', e.target.textContent || e.target.id);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT') {
                console.log('⌨️ 입력 변화:', e.target.id, '=', e.target.value);
            }
        });

        // 초기 로드 시 콘솔 메시지
        console.log('🚀 Rodi-X Preview 클라이언트 준비 완료');
        console.log('💡 개발 도구를 사용하여 변환 과정을 확인하세요');
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
    connectedClients: io.sockets.sockets.size,
    converterStats: converter.getStats(),
    uptime: process.uptime(),
    serverTime: new Date().toISOString()
  });
});

/**
 * API 라우트 - 변환 통계 조회
 */
app.get('/api/converter/stats', (req, res) => {
  res.json(converter.getStats());
});

/**
 * API 라우트 - 변환 통계 초기화
 */
app.post('/api/converter/reset', (req, res) => {
  converter.resetStats();
  res.json({ success: true, message: 'Stats reset successfully' });
});

/**
 * API 라우트 - 원본 HTML 조회
 */
app.get('/api/source', (req, res) => {
  try {
    if (!currentHtmlFile || !fs.existsSync(currentHtmlFile)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const htmlContent = fs.readFileSync(currentHtmlFile, 'utf8');
    res.json({
      file: currentHtmlFile,
      content: htmlContent,
      size: Buffer.byteLength(htmlContent, 'utf8'),
      lastModified: fs.statSync(currentHtmlFile).mtime
    });
  } catch (error) {
    console.error('❌ 원본 HTML 조회 오류:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * API 라우트 - 변환된 HTML 조회
 */
app.get('/api/converted', (req, res) => {
  try {
    if (!currentHtmlFile || !fs.existsSync(currentHtmlFile)) {
      return res.status(404).json({ error: 'File not found' });
    }
    const htmlContent = fs.readFileSync(currentHtmlFile, 'utf8');
    const convertedHtml = converter.convert(htmlContent);
    res.json({
      file: currentHtmlFile,
      content: convertedHtml,
      size: Buffer.byteLength(convertedHtml, 'utf8'),
      stats: converter.getStats()
    });
  } catch (error) {
    console.error('❌ 변환된 HTML 조회 오류:', error);
    res.status(500).json({ error: error.message, stack: error.stack });
  }
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

  if (!watchDirectory) {
    console.error('❌ 감시할 디렉토리가 설정되지 않았습니다');
    return;
  }

  console.log('👀 파일 감시 시작:', watchDirectory);
  console.log('📁 감시 패턴:', path.join(watchDirectory, '*.html'));

  watcher = chokidar.watch(path.join(watchDirectory, '*.html'), {
    ignored: /[\/\\]\./,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: config.SERVER_CONFIG.watch
  });

  watcher.on('change', (filepath) => {
    console.log('📝 파일 변경 감지:', filepath);
    console.log('   현재 파일:', currentHtmlFile);
    console.log('   변경된 파일:', filepath);

    const normalizedCurrent = path.normalize(currentHtmlFile);
    const normalizedChanged = path.normalize(filepath);

    if (normalizedChanged === normalizedCurrent) {
      console.log('✅ 현재 프리뷰 파일이 변경됨 - 클라이언트에 알림');
      io.emit('file-changed', {
        file: filepath,
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('ℹ️  다른 HTML 파일 변경됨 - 무시');
    }
  });

  watcher.on('add', (filepath) => {
    console.log('➕ 새 HTML 파일 추가:', filepath);
  });

  watcher.on('unlink', (filepath) => {
    console.log('➖ HTML 파일 삭제:', filepath);
    if (path.normalize(filepath) === path.normalize(currentHtmlFile)) {
      console.error('⚠️  현재 프리뷰 중인 파일이 삭제되었습니다!');
      io.emit('file-deleted', {
        file: filepath,
        timestamp: new Date().toISOString()
      });
    }
  });

  watcher.on('error', (error) => {
    console.error('❌ 파일 감시 오류:', error);
    console.error('   오류 상세:', {
      message: error.message,
      code: error.code,
      path: error.path
    });
  });

  watcher.on('ready', () => {
    console.log('✅ 파일 감시 준비 완료');
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
  console.log('\n' + '='.repeat(70));
  console.log('🚀 Rodi-X Preview 서버 시작!');
  console.log('='.repeat(70));

  // 설정 유효성 검증
  const validation = config.validate();
  if (!validation.valid) {
    console.error('\n❌ 설정 오류 발견:');
    validation.errors.forEach(err => console.error(`   - ${err}`));
    console.error('\n💡 config.js 파일의 경로 설정을 확인해주세요.\n');
    console.log('='.repeat(70) + '\n');
    return;
  }

  console.log(`\n📂 V3 프로젝트 경로: ${config.V3_ROOT}`);
  console.log(`📦 RodiX 컴포넌트: ${config.RODIX_COMPONENTS_DIR}`);

  console.log(`\n🌐 서버 주소:`);
  console.log(`   📱 프리뷰: http://${config.SERVER_CONFIG.host}:${PORT}`);
  console.log(`   📊 상태: http://${config.SERVER_CONFIG.host}:${PORT}/api/status`);
  console.log(`   🔍 원본: http://${config.SERVER_CONFIG.host}:${PORT}/api/source`);
  console.log(`   ✨ 변환: http://${config.SERVER_CONFIG.host}:${PORT}/api/converted`);

  // 스타일 사전 로딩
  console.log(`\n🎨 컴포넌트 스타일 로딩 시작...`);
  try {
    const loadResult = styleLoader.loadAllStyles();
    console.log(`✅ 스타일 로딩 성공: ${loadResult.loaded}개 (전역: ${loadResult.globalLoaded}, Atoms: ${loadResult.atomsLoaded}, RodiX: ${loadResult.rodixLoaded})`);

    if (loadResult.errors.length > 0) {
      console.warn(`\n⚠️  일부 스타일 로드 실패 (${loadResult.errors.length}개):`);
      loadResult.errors.forEach(err => {
        console.warn(`   - ${err.componentName}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error(`\n❌스타일 로딩 실패:`, error.message);
  }

  // HTML 파일 로드
  const htmlFilePath = config.getHtmlFilePath();
  console.log(`\n📄 프리뷰 파일: ${htmlFilePath}`);

  if (fs.existsSync(htmlFilePath)) {
    currentHtmlFile = htmlFilePath;
    watchDirectory = path.dirname(htmlFilePath);
    startWatching();

    console.log(`✅ 파일 로드 성공!`);
    console.log(`   파일명: ${path.basename(htmlFilePath)}`);
    console.log(`   폴더: ${watchDirectory}`);
    console.log(`   크기: ${(fs.statSync(htmlFilePath).size / 1024).toFixed(2)} KB`);
  } else {
    console.error(`\n❌ HTML 파일을 찾을 수 없습니다!`);
    console.error(`   경로: ${htmlFilePath}`);
    console.error(`\n💡 해결 방법:`);
    console.error(`   config.js에서 HTML_FOLDER와 HTML_FILE을 확인하세요`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('✅ 서버 준비 완료! 브라우저에서 접속하세요.');
  console.log('='.repeat(70) + '\n');
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