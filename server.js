// ==========================================
// 설정 및 의존성
// ==========================================
const path = require('path');
const config = require('./config');
const StyleLoader = require('./styleLoader');
const PluginLoader = require('./pluginLoader');
const TemplateRenderer = require('./templateRenderer');

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

// 스타일 캐시 (서버 시작 시 한 번만 로드)
let cachedStyles = null;

// 플러그인 로더 (HTML 파일의 부모 디렉토리)
let pluginLoader = null;
let pluginJS = '';

// 템플릿 렌더러
const templateRenderer = new TemplateRenderer(path.join(__dirname, 'template.html'));

const app = express();
const server = http.createServer(app);
const io = socketIo(server, config.SERVER_CONFIG.socketIO);

// ==========================================
// 정적 파일 서빙 (V3 이미지 및 에셋)
// ==========================================

// V3 프로젝트의 static 폴더를 /static 경로로 서빙
app.use('/static', express.static(path.join(config.RODI_WEB_SVC, 'static')));
console.log(`[FOLDER] 정적 파일 서빙 설정: /static -> ${path.join(config.RODI_WEB_SVC, 'static')}`);

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
        <h1>[ERROR] 파일을 찾을 수 없습니다</h1>
        <p>파일: ${currentHtmlFile || 'NOT_SET'}</p>
        <p>config.js의 HTML_FOLDER와 HTML_FILE 경로를 확인해주세요.</p>
      `);
      return;
    }

    const htmlContent = fs.readFileSync(currentHtmlFile, 'utf8');
    const convertedHtml = converter.convert(htmlContent);

    // V3 프로젝트의 실제 스타일 사용 (캐시된 스타일)
    const rodiXStyles = cachedStyles || { styles: '', loaded: 0 };

    // 템플릿 렌더링
    const previewHtml = templateRenderer.render({
      fileName: path.basename(currentHtmlFile),
      rodiXStyles,
      convertedHtml,
      pluginJS,
      debugMode: true,
      currentHtmlFile
    });

    res.send(previewHtml);
  } catch (error) {
    console.error('[ERROR] 오류:', error);
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
    console.error('[ERROR] 원본 HTML 조회 오류:', error);
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
    console.error('[ERROR] 변환된 HTML 조회 오류:', error);
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
    console.error('[ERROR] 감시할 디렉토리가 설정되지 않았습니다');
    return;
  }

  // 플러그인 디렉토리 (htmlStore의 부모)
  const pluginDir = path.dirname(watchDirectory);

  console.log('[WATCH] 파일 감시 시작:');
  console.log(`   HTML: ${path.join(watchDirectory, '*.html')}`);
  console.log(`   JS: ${path.join(pluginDir, '*.js')}`);
  console.log(`   SCSS: ${path.join(config.RODI_WEB_SVC, '**/*.scss')}`);

  // HTML, JS, SCSS 파일 모두 감시
  watcher = chokidar.watch([
    path.join(watchDirectory, '*.html'),
    path.join(pluginDir, '*Contribution.js'),
    path.join(pluginDir, '*Service.js'),
    path.join(config.RODI_WEB_SVC, 'components/**/*.scss'),
    path.join(config.RODI_WEB_SVC, 'styles/**/*.scss')
  ], {
    ignored: /[\/\\]\./,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: config.SERVER_CONFIG.watch
  });

  const handleFileUpdate = (filepath, eventType) => {
    console.log(`[SOURCE] 파일 ${eventType} 감지:`, filepath);
    const ext = path.extname(filepath).toLowerCase();

    // SCSS 파일 변경 감지
    if (ext === '.scss') {
      console.log('[REFRESH] SCSS 파일 업데이트 - 스타일 리로드 중...');
      try {
        cachedStyles = styleLoader.loadAllStyles();
        console.log('[OK] 스타일 리로드 완료');
        console.log('   로드된 스타일:', cachedStyles.loaded, '개');

        io.emit('file-changed', {
          file: filepath,
          type: 'scss',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[ERROR] 스타일 리로드 실패:', error.message);
      }
      return;
    }

    if (ext === '.js') {
      console.log('[REFRESH] 플러그인 JS 업데이트 - 리로드 중...');
      try {
        const pluginDir = path.dirname(watchDirectory);
        pluginLoader = new PluginLoader(pluginDir);
        const pluginData = pluginLoader.load();

        if (pluginData) {
          pluginJS = pluginLoader.convertToBrowserJS(pluginData);
          console.log('[OK] 플러그인 리로드 완료');
          console.log('   크기:', (pluginJS.length / 1024).toFixed(2), 'KB');
        }

        io.emit('file-changed', {
          file: filepath,
          type: 'plugin-js',
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error('[ERROR] 플러그인 리로드 실패:', error.message);
      }
      return;
    }

    const normalizedCurrent = path.normalize(currentHtmlFile);
    const normalizedChanged = path.normalize(filepath);

    if (normalizedChanged === normalizedCurrent) {
      console.log('[OK] 현재 프리뷰 파일 업데이트 - 클라이언트 알림');
      io.emit('file-changed', {
        file: filepath,
        type: 'html',
        timestamp: new Date().toISOString()
      });
    } else {
      console.log('[WARN]  다른 HTML 파일 변경 - 무시');
    }
  };

  watcher.on('change', (filepath) => {
    handleFileUpdate(filepath, '변경');
  });

  watcher.on('add', (filepath) => {
    handleFileUpdate(filepath, '추가');
  });

  watcher.on('unlink', (filepath) => {
    console.log('- HTML 파일 삭제:', filepath);
    if (path.normalize(filepath) === path.normalize(currentHtmlFile)) {
      console.error('[WARN]  현재 프리뷰 중인 파일이 삭제되었습니다!');
      io.emit('file-deleted', {
        file: filepath,
        timestamp: new Date().toISOString()
      });
    }
  });

  watcher.on('error', (error) => {
    console.error('[ERROR] 파일 감시 오류:', error);
    console.error('   오류 상세:', {
      message: error.message,
      code: error.code,
      path: error.path
    });
  });

  watcher.on('ready', () => {
    console.log('[OK] 파일 감시 준비 완료');
  });
}

// ==========================================
// Socket.IO 연결 처리
// ==========================================

io.on('connection', (socket) => {
  console.log('[LINK] 클라이언트 연결:', socket.id);

  socket.on('disconnect', () => {
    console.log('[ERROR] 클라이언트 연결 해제:', socket.id);
  });
});

// ==========================================
// 서버 시작
// ==========================================

server.listen(PORT, () => {
  console.log('\n' + '='.repeat(70));
  console.log('[READY] Rodi-X Preview 서버 시작!');
  console.log('='.repeat(70));

  // 설정 유효성 검증
  const validation = config.validate();
  if (!validation.valid) {
    console.error('\n[ERROR] 설정 오류 발견:');
    validation.errors.forEach(err => console.error(`   - ${err}`));
    console.error('\n[TIP] config.js 파일의 경로 설정을 확인해주세요.\n');
    console.log('='.repeat(70) + '\n');
    return;
  }

  console.log(`\n[DIR] V3 프로젝트 경로: ${config.V3_ROOT}`);
  console.log(`[PACKAGE] RodiX 컴포넌트: ${config.RODIX_COMPONENTS_DIR}`);

  console.log(`\n[URL] 서버 주소:`);
  console.log(`   [PREVIEW] 프리뷰: http://${config.SERVER_CONFIG.host}:${PORT}`);
  console.log(`   [STATS] 상태: http://${config.SERVER_CONFIG.host}:${PORT}/api/status`);
  console.log(`   [SRC] 원본: http://${config.SERVER_CONFIG.host}:${PORT}/api/source`);
  console.log(`   [CONVERTED] 변환: http://${config.SERVER_CONFIG.host}:${PORT}/api/converted`);

  // 스타일 사전 로딩 (한 번만 로드하고 캐시)
  console.log(`\n[STYLE] 컴포넌트 스타일 로딩 시작...`);
  try {
    cachedStyles = styleLoader.loadAllStyles();
    console.log(`[OK] 스타일 로딩 성공: ${cachedStyles.loaded}개 (전역: ${cachedStyles.globalLoaded}, Atoms: ${cachedStyles.atomsLoaded}, RodiX: ${cachedStyles.rodixLoaded})`);

    if (cachedStyles.errors.length > 0) {
      console.warn(`\n[WARN]  일부 스타일 로드 실패 (${cachedStyles.errors.length}개):`);
      cachedStyles.errors.forEach(err => {
        console.warn(`   - ${err.componentName}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error(`\n[ERROR] 스타일 로딩 실패:`, error.message);
    cachedStyles = { styles: '', loaded: 0, errors: [] };
  }

  // HTML 파일 로드
  const htmlFilePath = config.getHtmlFilePath();
  console.log(`\n[FILE] 프리뷰 파일: ${htmlFilePath}`);

  if (fs.existsSync(htmlFilePath)) {
    currentHtmlFile = htmlFilePath;
    watchDirectory = path.dirname(htmlFilePath);

    console.log(`[OK] 파일 로드 성공!`);
    console.log(`   파일명: ${path.basename(htmlFilePath)}`);
    console.log(`   폴더: ${watchDirectory}`);
    console.log(`   크기: ${(fs.statSync(htmlFilePath).size / 1024).toFixed(2)} KB`);

    // 플러그인 로드 (htmlStore의 부모 디렉토리)
    const pluginDir = path.dirname(watchDirectory);
    console.log(`\n[PLUGIN] 플러그인 로딩: ${pluginDir}`);

    try {
      pluginLoader = new PluginLoader(pluginDir);
      const pluginData = pluginLoader.load();

      if (pluginData) {
        pluginJS = pluginLoader.convertToBrowserJS(pluginData);
        console.log(`[OK] 플러그인 JavaScript 생성 완료`);
        console.log(`   크기: ${(pluginJS.length / 1024).toFixed(2)} KB`);
      }
    } catch (error) {
      console.warn(`[WARN]  플러그인 로드 실패: ${error.message}`);
      console.warn(`   패턴 기반 이벤트만 사용됩니다`);
    }

    // 파일 감시 시작 (HTML + JS)
    startWatching();
  } else {
    console.error(`\n[ERROR] HTML 파일을 찾을 수 없습니다!`);
    console.error(`   경로: ${htmlFilePath}`);
    console.error(`\n[TIP] 해결 방법:`);
    console.error(`   config.js에서 HTML_FOLDER와 HTML_FILE을 확인하세요`);
  }

  console.log('\n' + '='.repeat(70));
  console.log('[OK] 서버 준비 완료! 브라우저에서 접속하세요.');
  console.log('='.repeat(70) + '\n');
});

// ==========================================
// 우아한 종료
// ==========================================

process.on('SIGINT', () => {
  console.log('\n[STOP] 서버 종료 중...');
  if (watcher) {
    watcher.close();
  }
  server.close(() => {
    console.log('[OK] 서버가 종료되었습니다');
    process.exit(0);
  });
});


