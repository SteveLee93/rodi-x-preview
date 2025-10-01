// ==========================================
// 설정 및 의존성
// ==========================================
const path = require('path');
const config = require('./config');
const StyleLoader = require('./styleLoader');
const PluginLoader = require('./pluginLoader');

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

// 플러그인 로더 (HTML 파일의 부모 디렉토리)
let pluginLoader = null;
let pluginJS = '';

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

    <!-- V3 스타일 강제 적용 (사용자 HTML의 인라인 스타일 오버라이드) -->
    <style id="v3-style-override">
/*
  V3 기본 버튼 스타일 보존
  - 인라인 스타일의 line-height 오버라이드를 방지
*/
.btn {
  line-height: inherit !important;
}

/* PID Tuning 위젯의 잘못된 line-height 수정 */
button.PID-gain-table-btn.btn,
.PID-gain-table-btn.btn.primary {
  line-height: normal !important;
  height: auto !important;
}

/* Components Extension의 nav-tab 버튼 스타일 수정 */
.nav-tab .btn {
  /* 인라인 스타일 line-height: 45px를 V3 기본값으로 복원 */
  line-height: inherit !important;
  /* V3의 기본 padding 복원 */
  padding: 11px 18px !important;
  /* height를 고정하지 않고 컨텐츠에 맞춤 */
  height: auto !important;
  min-height: 45px;
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
        <h1>[READY] Rodi-X Live Preview</h1>
        <div class="file-info">
            [FOLDER] 파일: ${currentHtmlFile}<br>
            [TIME] 마지막 업데이트: ${new Date().toLocaleString()}
            <span id="status" class="status connected">* 연결됨</span>
        </div>
    </div>

    <div class="debug-toolbar">
        <span style="font-weight: bold;">[TOOLS] 개발 도구:</span>
        <button class="debug-btn" onclick="togglePanel('stats')">[STATS] 통계</button>
        <button class="debug-btn" onclick="togglePanel('source')">[SOURCE] 원본 HTML</button>
        <button class="debug-btn" onclick="togglePanel('converted')">[CONVERTED] 변환 HTML</button>
        <button class="debug-btn" onclick="refreshPreview()">[REFRESH] 새로고침</button>
    </div>

    <div id="panel-stats" class="debug-panel">
        <h3>[STATS] 변환 통계</h3>
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
        <h3>[SOURCE] 원본 HTML (Rodi-X 컴포넌트)</h3>
        <pre id="source-content">로딩 중...</pre>
    </div>

    <div id="panel-converted" class="debug-panel">
        <h3>[CONVERTED] 변환된 HTML (표준 HTML)</h3>
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
            statusEl.textContent = '* 연결됨';
            statusEl.className = 'status connected';
            console.log('[LINK] 서버에 연결되었습니다');
        });

        socket.on('disconnect', () => {
            statusEl.textContent = '* 연결끊김';
            statusEl.className = 'status disconnected';
            console.log('[ERROR] 서버 연결이 끊어졌습니다');
        });

        socket.on('file-changed', (data) => {
            console.log('[SOURCE] 파일이 변경되었습니다:', data.file);
            document.body.style.opacity = '0.7';
            setTimeout(() => {
                window.location.reload();
            }, 200);
        });

        socket.on('file-deleted', (data) => {
            alert('[WARN] 프리뷰 중인 파일이 삭제되었습니다!');
            console.error('[ERROR] 파일 삭제:', data.file);
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
                console.log('[CLICK] 버튼 클릭:', e.target.textContent || e.target.id);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT') {
                console.log('[INPUT] 입력 변화:', e.target.id, '=', e.target.value);
            }
        });

        // 초기 로드 시 콘솔 메시지
        console.log('[READY] Rodi-X Preview 클라이언트 준비 완료');
        console.log('[TIP] 개발 도구를 사용하여 변환 과정을 확인하세요');

        // ============================================
        // V3 RodiX API 에뮬레이션 - 범용 자동 이벤트 시스템
        // ============================================

        /**
         * RodiX 이벤트 에뮬레이터
         * HTML을 분석하여 자동으로 이벤트 핸들러를 연결합니다.
         */
        class RodiXEmulator {
            constructor() {
                this.components = new Map();
                this.eventHandlers = new Map();
            }

            registerHandler(componentId, handler) {
                if (!componentId || typeof handler !== 'function') {
                    return;
                }

                if (!this.eventHandlers.has(componentId)) {
                    this.eventHandlers.set(componentId, new Set());
                }

                this.eventHandlers.get(componentId).add(handler);
            }

            emitEvent(componentId, type, payload = {}) {
                const handlers = this.eventHandlers.get(componentId);
                if (!handlers || handlers.size === 0) {
                    return;
                }

                handlers.forEach(callback => {
                    try {
                        callback(type, payload);
                    } catch (error) {
                        console.error('RodiX handler error:', {
                            componentId,
                            type,
                            message: error.message
                        });
                    }
                });
            }

            closeOpenSelectBoxes(except = null) {
                document.querySelectorAll('.select-box.open').forEach(box => {
                    if (except && box === except) {
                        return;
                    }

                    const dropdown = box.querySelector('.wrapper');
                    box.classList.remove('open');
                    if (dropdown) {
                        dropdown.style.display = 'none';
                    }
                });
            }

            /**
             * 초기화 - 모든 컴포넌트 스캔 및 이벤트 연결
             */
            init() {
                console.log('\\n[INIT] RodiX 에뮬레이터 초기화 시작...');

                this.scanComponents();
                this.applyVisibility();
                this.applyInitialCheckState();
                this.bindButtonEvents();
                this.bindInputEvents();
                this.bindSelectEvents();
                this.bindSliderEvents();
                this.detectPatterns();

                console.log(\`[OK] 에뮬레이터 초기화 완료 (컴포넌트 \${this.components.size}개)\\n\`);
            }

            /**
             * 페이지의 모든 ID 있는 요소를 스캔
             */
            scanComponents() {
                const elements = document.querySelectorAll('[id]');
                elements.forEach(el => {
                    this.components.set(el.id, el);
                });
                console.log(\`[PACKAGE] 스캔 완료: \${elements.length}개 컴포넌트\`);
            }

            /**
             * data-visible 속성에 따라 초기 표시/숨김 처리
             */
            applyVisibility() {
                const visibleElements = document.querySelectorAll('[data-visible]');
                visibleElements.forEach(el => {
                    const visible = el.getAttribute('data-visible') === 'true';
                    el.style.display = visible ? '' : 'none';
                });
                if (visibleElements.length > 0) {
                    console.log(\`👁️  Visibility 처리: \${visibleElements.length}개 요소\`);
                }
            }

            /**
             * 체크박스/라디오 버튼/슬라이더의 초기 상태 적용
             */
            applyInitialCheckState() {
                // 체크박스 초기 상태
                const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(checkbox => {
                    const wrapper = checkbox.closest('.checkbox-wrapper');
                    if (!wrapper) return;

                    const icon = wrapper.querySelector('.ico-checkbox');
                    if (!icon) return;

                    // checked 속성 처리
                    if (checkbox.checked) {
                        icon.classList.add('checked');
                    }

                    // disabled 속성 처리
                    if (checkbox.disabled) {
                        icon.classList.add('disabled');
                        wrapper.style.cursor = 'not-allowed';
                    }
                });

                // 라디오 버튼 초기 상태
                const radios = document.querySelectorAll('input[type="radio"]');
                radios.forEach(radio => {
                    const wrapper = radio.closest('.radio-wrapper');
                    if (!wrapper) return;

                    const icon = wrapper.querySelector('.ico-radio');
                    if (!icon) return;

                    // checked 속성 처리
                    if (radio.checked) {
                        icon.classList.add('checked');
                    }

                    // disabled 속성 처리
                    if (radio.disabled) {
                        icon.classList.add('disabled');
                        wrapper.style.cursor = 'not-allowed';
                    }
                });

                // 슬라이더 초기 상태
                const sliders = document.querySelectorAll('input[type="range"]');
                sliders.forEach(slider => {
                    // disabled 속성 처리 - 브라우저 기본 스타일 적용
                    if (slider.disabled) {
                        slider.style.cursor = 'not-allowed';
                        slider.style.opacity = '0.5';
                    }
                });

                console.log(\`🎛️  초기 상태 적용: 체크박스 \${checkboxes.length}개, 라디오 \${radios.length}개, 슬라이더 \${sliders.length}개\`);
            }

            /**
             * 모든 버튼에 자동 이벤트 연결
             */
            bindButtonEvents() {
                const buttons = document.querySelectorAll('button[id]');
                let count = 0;

                buttons.forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        this.handleButtonClick(btn.id, btn, e);
                    });
                    count++;
                });

                if (count > 0) {
                    console.log(\`🔘 버튼 이벤트 연결: \${count}개\`);
                }
            }

            /**
             * 버튼 클릭 처리 - 패턴 기반 자동 동작
             */
            handleButtonClick(id, element, event) {
                console.log(\`[CLICK]  버튼 클릭: #\${id}\`);

                // 패턴 1: 탭 전환 (active 클래스 토글)
                if (element.classList.contains('btn') && element.parentElement.classList.contains('nav-tab')) {
                    this.handleTabSwitch(id, element);
                    return;
                }

                // 패턴 2: Show 버튼 (메시지 표시)
                if (id.toLowerCase().includes('message') || element.textContent.toLowerCase().includes('show')) {
                    this.handleShowMessage(id);
                    return;
                }

                // 패턴 3: Add 버튼 (추가 동작)
                if (id.toLowerCase().includes('add') || element.textContent.toLowerCase().includes('add')) {
                    this.handleAddAction(id);
                    return;
                }

                // 패턴 4: Delete/Del 버튼 (삭제 동작)
                if (id.toLowerCase().includes('del') || element.textContent.toLowerCase().includes('del')) {
                    this.handleDeleteAction(id);
                    return;
                }

                // 패턴 5: Revert 버튼 (복원 동작)
                if (id.toLowerCase().includes('rvt') || element.textContent.toLowerCase().includes('revert')) {
                    this.handleRevertAction(id);
                    return;
                }
            }

            /**
             * 탭 전환 처리
             */
            handleTabSwitch(activeId, activeElement) {
                // 같은 nav-tab 내의 모든 버튼에서 active 제거
                const navTab = activeElement.parentElement;
                navTab.querySelectorAll('.btn').forEach(btn => {
                    btn.classList.remove('active');
                });
                activeElement.classList.add('active');

                // 관련 div 표시/숨김 (id 패턴 매칭)
                const btnPrefix = activeId.replace(/^btn/, '');
                const divId = 'div' + btnPrefix;

                // 모든 div를 숨기고 해당 div만 표시
                document.querySelectorAll('[id^="div"][data-visible]').forEach(div => {
                    div.style.display = 'none';
                });

                const targetDiv = this.components.get(divId);
                if (targetDiv) {
                    targetDiv.style.display = 'block';
                    console.log(\`  -> 탭 전환: #\${divId} 표시\`);
                }
            }

            /**
             * 메시지 표시 처리
             */
            handleShowMessage(btnId) {
                // 관련 input과 select 찾기
                const inputId = btnId.replace('btn', 'input');
                const selectId = btnId.replace('btn', 'select');

                const input = this.components.get(inputId);
                const select = this.components.get(selectId);

                const message = input ? input.value : 'Message';
                const type = select ? select.value : 'INFO';
                const icon = type === 'ERROR' ? '[ERROR]' : type === 'WARNING' ? '[WARN]' : 'ℹ️';

                alert(\`\${icon} \${type}\\n\\n\${message}\`);
                console.log(\`  -> 메시지 표시: [\${type}] \${message}\`);
            }

            /**
             * 추가 동작 처리
             */
            handleAddAction(btnId) {
                // Option 추가
                if (btnId.toLowerCase().includes('option')) {
                    const selectId = btnId.replace('btnAdd', 'select').replace('Option', '');
                    const select = this.components.get(selectId) ||
                                  this.components.get('selectAddDelOption');

                    if (select && select.tagName === 'SELECT') {
                        const optionCount = select.options.length + 1;
                        const option = document.createElement('option');
                        option.value = \`Option\${optionCount}\`;
                        option.text = \`Option\${optionCount}\`;
                        select.add(option);
                        select.value = option.value;
                        console.log(\`  -> 옵션 추가: Option\${optionCount}\`);
                    }
                }
                // Row 추가
                else if (btnId.toLowerCase().includes('row')) {
                    const tableId = btnId.replace('btnAdd', 'table').replace('Row', '');
                    const table = this.components.get(tableId) ||
                                 this.components.get('tableAddRow');

                    if (table && table.tagName === 'TABLE') {
                        const tbody = table.querySelector('tbody') || table;
                        const firstRow = tbody.querySelector('tr');
                        const cellCount = firstRow ? firstRow.cells.length : 4;

                        const row = tbody.insertRow();
                        for (let i = 0; i < cellCount; i++) {
                            const cell = row.insertCell(i);
                            cell.textContent = 'text';
                        }
                        console.log(\`  -> 테이블 행 추가 (\${cellCount}개 셀)\`);
                    }
                }
            }

            /**
             * 삭제 동작 처리
             */
            handleDeleteAction(btnId) {
                if (btnId.toLowerCase().includes('option')) {
                    const selectId = btnId.replace('btnDel', 'select').replace('Option', '');
                    const select = this.components.get(selectId) ||
                                  this.components.get('selectAddDelOption');

                    if (select && select.tagName === 'SELECT' && select.options.length > 0) {
                        const lastOption = select.options[select.options.length - 1];
                        console.log(\`  -> 옵션 삭제: \${lastOption.text}\`);
                        select.remove(select.options.length - 1);
                        if (select.options.length > 0) {
                            select.selectedIndex = select.options.length - 1;
                        }
                    }
                }
            }

            /**
             * 복원 동작 처리
             */
            handleRevertAction(btnId) {
                const tableId = btnId.replace('btnRvt', 'table');
                const table = this.components.get(tableId) ||
                             this.components.get('tableAddRow');

                if (table && table.tagName === 'TABLE') {
                    // 원본 테이블 구조 복원 (첫 2개 행만 유지)
                    const rows = Array.from(table.rows);
                    while (rows.length > 2) {
                        table.deleteRow(2);
                        rows.pop();
                    }
                    console.log(\`  -> 테이블 복원\`);
                }
            }

            /**
             * Input 이벤트 연결
             */
            bindInputEvents() {
                const inputs = document.querySelectorAll('input[id]');
                let count = 0;

                inputs.forEach(input => {
                    // 일반 input 이벤트
                    input.addEventListener('input', (e) => {
                        console.log(\`[INPUT]  입력: #\${input.id} = "\${e.target.value}"\`);
                    });

                    // 체크박스 change 이벤트
                    if (input.type === 'checkbox') {
                        input.addEventListener('change', (e) => {
                            this.handleCheckboxChange(e.target);
                        });
                    }

                    // 라디오 change 이벤트
                    if (input.type === 'radio') {
                        input.addEventListener('change', (e) => {
                            this.handleRadioChange(e.target);
                        });
                    }

                    count++;
                });

                if (count > 0) {
                    console.log(\`[INPUT]  Input 이벤트 연결: \${count}개\`);
                }
            }

            /**
             * 체크박스 상태 변경 처리
             */
            handleCheckboxChange(checkbox) {
                // disabled 체크박스는 변경 불가
                if (checkbox.disabled) return;

                const wrapper = checkbox.closest('.checkbox-wrapper');
                if (!wrapper) return;

                const icon = wrapper.querySelector('.ico-checkbox');
                if (!icon) return;

                if (checkbox.checked) {
                    icon.classList.add('checked');
                    console.log(\`[OK] 체크박스 체크: #\${checkbox.id}\`);
                } else {
                    icon.classList.remove('checked');
                    console.log(\`☐ 체크박스 해제: #\${checkbox.id}\`);
                }
            }

            /**
             * 라디오 버튼 상태 변경 처리
             */
            handleRadioChange(radio) {
                // disabled 라디오는 변경 불가
                if (radio.disabled) return;

                // 같은 name을 가진 모든 라디오에서 checked 클래스 제거
                if (radio.name) {
                    const radios = document.querySelectorAll(\`input[type="radio"][name="\${radio.name}"]\`);
                    radios.forEach(r => {
                        const wrapper = r.closest('.radio-wrapper');
                        if (wrapper) {
                            const icon = wrapper.querySelector('.ico-radio');
                            if (icon) icon.classList.remove('checked');
                        }
                    });
                }

                // 선택된 라디오에 checked 클래스 추가
                const wrapper = radio.closest('.radio-wrapper');
                if (!wrapper) return;

                const icon = wrapper.querySelector('.ico-radio');
                if (!icon) return;

                icon.classList.add('checked');
                console.log(\`🔘 라디오 선택: #\${radio.id}\`);
            }

            /**
             * Select 이벤트 연결
             */
            bindSelectEvents() {
                const nativeSelects = document.querySelectorAll('select[id]');
                const customSelects = document.querySelectorAll('.select-box[id]');
                let count = 0;

                nativeSelects.forEach(select => {
                    select.addEventListener('change', () => {
                        const option = select.options[select.selectedIndex];
                        const detail = {
                            selected: select.value,
                            label: option ? option.textContent : ''
                        };

                        this.emitEvent(select.id, 'select', detail);
                        select.dispatchEvent(new CustomEvent('rodix-select', { detail }));
                    });
                    count++;
                });

                customSelects.forEach(selectBox => {
                    const placeholder = selectBox.querySelector('.placeholder');
                    const dropdown = selectBox.querySelector('.wrapper');
                    const textEl = placeholder ? placeholder.querySelector('.cell.text') : null;
                    const optionNodes = dropdown ? Array.from(dropdown.querySelectorAll('.drop-down-item')) : [];

                    if (!placeholder || !dropdown || !textEl) {
                        return;
                    }

                    const setActive = (item) => {
                        optionNodes.forEach(opt => opt.classList.remove('active'));
                        if (item) {
                            item.classList.add('active');
                        }
                    };

                    const closeDropdown = () => {
                        selectBox.classList.remove('open');
                        dropdown.style.display = 'none';
                    };

                    const openDropdown = () => {
                        this.closeOpenSelectBoxes(selectBox);
                        selectBox.classList.add('open');
                        dropdown.style.display = 'block';
                    };

                    const emitSelection = (item) => {
                        if (!item) {
                            return;
                        }

                        const value = item.dataset.value || item.textContent.trim();
                        const label = item.textContent.trim();

                        textEl.textContent = label;
                        selectBox.dataset.value = value;

                        const detail = { selected: value, label };
                        this.emitEvent(selectBox.id, 'select', detail);
                        selectBox.dispatchEvent(new CustomEvent('rodix-select', { detail }));
                        selectBox.dispatchEvent(new CustomEvent('change', { detail }));
                    };

                    const activeItem = optionNodes.find(opt => opt.classList.contains('active')) || optionNodes[0];
                    if (activeItem) {
                        setActive(activeItem);
                        selectBox.dataset.value = activeItem.dataset.value || activeItem.textContent.trim();
                        textEl.textContent = activeItem.textContent.trim();
                    } else {
                        selectBox.dataset.value = '';
                    }

                    placeholder.addEventListener('click', (e) => {
                        e.stopPropagation();

                        if (selectBox.classList.contains('open')) {
                            closeDropdown();
                            return;
                        }

                        openDropdown();

                        const handleOutside = (evt) => {
                            if (!selectBox.contains(evt.target)) {
                                closeDropdown();
                            }
                        };

                        document.addEventListener('click', handleOutside, { once: true });
                    });

                    optionNodes.forEach(item => {
                        item.addEventListener('click', (e) => {
                            e.stopPropagation();
                            setActive(item);
                            emitSelection(item);
                            closeDropdown();
                        });
                    });

                    const searchInput = dropdown.querySelector('input.search-mode');
                    if (searchInput) {
                        searchInput.addEventListener('input', (e) => {
                            const keyword = e.target.value.toLowerCase();
                            optionNodes.forEach(item => {
                                const match = item.textContent.toLowerCase().includes(keyword);
                                item.style.display = match ? '' : 'none';
                            });
                        });
                    }

                    count++;
                });

            }

            /**
             * XSlider 이벤트 연결 및 상호작용 구현
             */
            bindSliderEvents() {
                const sliders = document.querySelectorAll('.rc-slider');
                let count = 0;

                sliders.forEach(sliderContainer => {
                    const handle = sliderContainer.querySelector('.rc-slider-handle');
                    const track = sliderContainer.querySelector('.rc-slider-track');
                    const rail = sliderContainer.querySelector('.rc-slider-rail');

                    // keyboard-input 찾기 (같은 xslider 컨테이너 내부)
                    const xsliderContainer = sliderContainer.closest('[class*="xslider"]');
                    const keyboardInput = xsliderContainer ? xsliderContainer.querySelector('.keyboard-input') : null;

                    if (!handle || !track || !rail || !keyboardInput) {
                        console.warn('XSlider 요소 누락:', {
                            handle: !!handle,
                            track: !!track,
                            rail: !!rail,
                            keyboardInput: !!keyboardInput
                        });
                        return;
                    }

                    // 속성에서 min, max, step 읽기
                    const min = parseFloat(handle.getAttribute('aria-valuemin') || '0');
                    const max = parseFloat(handle.getAttribute('aria-valuemax') || '100');
                    const step = parseFloat(keyboardInput.step || '1');
                    const disabled = handle.getAttribute('aria-disabled') === 'true';

                    if (disabled) return; // disabled 슬라이더는 이벤트 연결 안 함

                    let currentValue = parseFloat(handle.getAttribute('aria-valuenow') || min);

                    // 드래그 상태
                    let isDragging = false;

                    // 값을 percentage로 변환
                    const valueToPercent = (value) => {
                        return ((value - min) / (max - min)) * 100;
                    };

                    // percentage를 값으로 변환
                    const percentToValue = (percent) => {
                        let value = (percent / 100) * (max - min) + min;
                        // step에 맞춰 반올림
                        value = Math.round(value / step) * step;
                        // 범위 제한
                        return Math.max(min, Math.min(max, value));
                    };

                    // UI 업데이트
                    const updateUI = (value) => {
                        const percent = valueToPercent(value);
                        handle.style.left = percent + '%';
                        track.style.width = percent + '%';
                        handle.setAttribute('aria-valuenow', value);
                        keyboardInput.value = value;
                        currentValue = value;
                    };

                    // 마우스 위치에서 값 계산
                    const getValueFromMouseEvent = (e) => {
                        const rect = rail.getBoundingClientRect();
                        const percent = ((e.clientX - rect.left) / rect.width) * 100;
                        return percentToValue(Math.max(0, Math.min(100, percent)));
                    };

                    // 드래그 시작
                    handle.addEventListener('mousedown', (e) => {
                        e.preventDefault();
                        isDragging = true;
                        handle.focus();
                        document.body.style.cursor = 'grabbing';
                        console.log(\`🎚️  슬라이더 드래그 시작: #\${sliderContainer.id}\`);
                    });

                    // 드래그 중
                    const onMouseMove = (e) => {
                        if (!isDragging) return;
                        const value = getValueFromMouseEvent(e);
                        updateUI(value);
                    };

                    // 드래그 끝
                    const onMouseUp = () => {
                        if (isDragging) {
                            isDragging = false;
                            document.body.style.cursor = '';
                            console.log(\`🎚️  슬라이더 값 변경: #\${sliderContainer.id} = \${currentValue}\`);
                        }
                    };

                    document.addEventListener('mousemove', onMouseMove);
                    document.addEventListener('mouseup', onMouseUp);

                    // Rail 클릭으로 직접 이동
                    rail.addEventListener('click', (e) => {
                        if (disabled || e.target === handle) return;
                        const value = getValueFromMouseEvent(e);
                        updateUI(value);
                        console.log(\`🎚️  슬라이더 클릭 이동: #\${sliderContainer.id} = \${value}\`);
                    });

                    // 키보드 입력과 동기화
                    keyboardInput.addEventListener('input', (e) => {
                        let value = parseFloat(e.target.value);
                        if (isNaN(value)) return;

                        // 범위 제한
                        value = Math.max(min, Math.min(max, value));
                        updateUI(value);
                    });

                    // 키보드 입력에서 엔터나 포커스 아웃 시 step 적용
                    const applyStep = () => {
                        let value = parseFloat(keyboardInput.value);
                        if (isNaN(value)) {
                            value = currentValue;
                        } else {
                            value = Math.round(value / step) * step;
                            value = Math.max(min, Math.min(max, value));
                        }
                        updateUI(value);
                        console.log(\`[INPUT]  키보드 입력: #\${sliderContainer.id} = \${value}\`);
                    };

                    keyboardInput.addEventListener('blur', applyStep);
                    keyboardInput.addEventListener('keydown', (e) => {
                        if (e.key === 'Enter') {
                            applyStep();
                            keyboardInput.blur();
                        }
                    });

                    // 핸들에서 키보드 방향키 지원
                    handle.addEventListener('keydown', (e) => {
                        let newValue = currentValue;

                        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
                            e.preventDefault();
                            newValue = Math.min(max, currentValue + step);
                        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
                            e.preventDefault();
                            newValue = Math.max(min, currentValue - step);
                        } else if (e.key === 'Home') {
                            e.preventDefault();
                            newValue = min;
                        } else if (e.key === 'End') {
                            e.preventDefault();
                            newValue = max;
                        } else {
                            return;
                        }

                        updateUI(newValue);
                        console.log(\`[INPUT]  키보드 조작: #\${sliderContainer.id} = \${newValue}\`);
                    });

                    count++;
                });

                if (count > 0) {
                    console.log(\`🎚️  Slider 이벤트 연결: \${count}개\`);
                }
            }

            /**
             * 패턴 감지 및 로깅
             */
            detectPatterns() {
                const patterns = {
                    tabs: document.querySelectorAll('.nav-tab .btn').length,
                    visibleDivs: document.querySelectorAll('[data-visible]').length,
                    addButtons: document.querySelectorAll('button[id*="Add"], button[id*="add"]').length,
                    delButtons: document.querySelectorAll('button[id*="Del"], button[id*="del"]').length,
                };

                console.log('[SRC] 감지된 패턴:');
                if (patterns.tabs > 0) console.log(\`  - 탭 시스템: \${patterns.tabs}개 탭\`);
                if (patterns.visibleDivs > 0) console.log(\`  - Visible 컨트롤: \${patterns.visibleDivs}개\`);
                if (patterns.addButtons > 0) console.log(\`  - 추가 버튼: \${patterns.addButtons}개\`);
                if (patterns.delButtons > 0) console.log(\`  - 삭제 버튼: \${patterns.delButtons}개\`);
            }
        }

        // RodiX 에뮬레이터 자동 초기화
        const rodiX = new RodiXEmulator();
        window.rodiX = rodiX; // 플러그인 에뮬레이터에서 접근 가능하도록
        document.addEventListener('DOMContentLoaded', () => {
            rodiX.init();
        });
    </script>

    <!-- V3 플러그인 JavaScript 에뮬레이션 -->
    <script>
${pluginJS}
    </script>
</body>
</html>`;

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

  // HTML과 JS 파일 모두 감시
  watcher = chokidar.watch([
    path.join(watchDirectory, '*.html'),
    path.join(pluginDir, '*Contribution.js'),
    path.join(pluginDir, '*Service.js')
  ], {
    ignored: /[\/\\]\./,
    persistent: true,
    ignoreInitial: true,
    awaitWriteFinish: config.SERVER_CONFIG.watch
  });

  const handleFileUpdate = (filepath, eventType) => {
    console.log(`[SOURCE] 파일 ${eventType} 감지:`, filepath);
    const ext = path.extname(filepath).toLowerCase();

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

  // 스타일 사전 로딩
  console.log(`\n[STYLE] 컴포넌트 스타일 로딩 시작...`);
  try {
    const loadResult = styleLoader.loadAllStyles();
    console.log(`[OK] 스타일 로딩 성공: ${loadResult.loaded}개 (전역: ${loadResult.globalLoaded}, Atoms: ${loadResult.atomsLoaded}, RodiX: ${loadResult.rodixLoaded})`);

    if (loadResult.errors.length > 0) {
      console.warn(`\n[WARN]  일부 스타일 로드 실패 (${loadResult.errors.length}개):`);
      loadResult.errors.forEach(err => {
        console.warn(`   - ${err.componentName}: ${err.error}`);
      });
    }
  } catch (error) {
    console.error(`\n[ERROR]스타일 로딩 실패:`, error.message);
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
  console.log(`   [PREVIEW] 프리뷰: http://${config.SERVER_CONFIG.host}:${PORT}`);
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


