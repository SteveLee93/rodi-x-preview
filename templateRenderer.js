/**
 * HTML 템플릿 렌더러
 *
 * 템플릿 파일을 읽어서 동적으로 값을 치환합니다.
 * 개발 모드와 프로덕션 모드를 지원합니다.
 */

const fs = require('fs');
const path = require('path');

class TemplateRenderer {
  constructor(templatePath) {
    this.templatePath = templatePath;
    this.template = fs.readFileSync(templatePath, 'utf8');
  }

  /**
   * RodiX 에뮬레이터 JavaScript 코드
   */
  getRodiXEmulator() {
    try {
      const emulatorPath = path.join(__dirname, 'rodiXEmulator.js');
      if (fs.existsSync(emulatorPath)) {
        return fs.readFileSync(emulatorPath, 'utf8');
      }
      console.warn('[WARN] rodiXEmulator.js 파일을 찾을 수 없습니다');
      return '// RodiX Emulator not found';
    } catch (error) {
      console.error('[ERROR] RodiX Emulator 로드 실패:', error.message);
      return '// RodiX Emulator load failed';
    }
  }

  /**
   * 디버그 모드 스타일
   */
  getDebugStyles() {
    return `
    <style id="preview-server-styles">
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
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

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
    </style>`;
  }

  /**
   * 디버그 모드 헤더
   */
  getDebugHeader(currentFile) {
    return `
    <div class="preview-header">
        <h1>[READY] Rodi-X Live Preview</h1>
        <div class="file-info">
            [FOLDER] 파일: ${currentFile}<br>
            [TIME] 마지막 업데이트: ${new Date().toLocaleString()}
            <span id="status" class="status connected">* 연결됨</span>
        </div>
    </div>`;
  }

  /**
   * 디버그 모드 툴바
   */
  getDebugToolbar() {
    return `
    <div class="debug-toolbar">
        <span style="font-weight: bold;">[TOOLS] 개발 도구:</span>
        <button class="debug-btn" onclick="togglePanel('stats')">[STATS] 통계</button>
        <button class="debug-btn" onclick="togglePanel('source')">[SOURCE] 원본 HTML</button>
        <button class="debug-btn" onclick="togglePanel('converted')">[CONVERTED] 변환 HTML</button>
        <button class="debug-btn" onclick="refreshPreview()">[REFRESH] 새로고침</button>
    </div>`;
  }

  /**
   * 디버그 모드 패널
   */
  getDebugPanels() {
    return `
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
    </div>`;
  }

  /**
   * 디버그 모드 JavaScript 함수
   */
  getDebugFunctions() {
    return `
        let activePanels = new Set();

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
                loadPanelData(panelName);
            }
        }

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

        function refreshPreview() {
            window.location.reload();
        }

        function formatUptime(seconds) {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const secs = Math.floor(seconds % 60);
            return \`\${hours}h \${minutes}m \${secs}s\`;
        }

        document.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON' && !e.target.classList.contains('debug-btn')) {
                console.log('[CLICK] 버튼 클릭:', e.target.textContent || e.target.id);
            }
        });

        document.addEventListener('input', (e) => {
            if (e.target.tagName === 'INPUT') {
                console.log('[INPUT] 입력 변화:', e.target.id, '=', e.target.value);
            }
        });`;
  }

  /**
   * 템플릿 렌더링
   */
  render(options = {}) {
    const {
      fileName = 'Unknown',
      rodiXStyles = { styles: '', loaded: 0 },
      convertedHtml = '',
      pluginJS = '',
      debugMode = true,
      currentHtmlFile = ''
    } = options;

    let html = this.template;

    // 기본 치환
    html = html.replace('{{FILE_NAME}}', fileName);
    html = html.replace('{{LOADED_COUNT}}', rodiXStyles.loaded);
    html = html.replace('{{RODIX_STYLES}}', rodiXStyles.styles);
    html = html.replace('{{CONVERTED_HTML}}', convertedHtml);
    html = html.replace('{{PLUGIN_JS}}', pluginJS);

    // RodiX 에뮬레이터
    const emulator = this.getRodiXEmulator();
    html = html.replace('{{RODIX_EMULATOR}}', emulator);

    // 디버그 모드
    if (debugMode) {
      html = html.replace('{{DEBUG_STYLES}}', this.getDebugStyles());
      html = html.replace('{{DEBUG_HEADER}}', this.getDebugHeader(currentHtmlFile));
      html = html.replace('{{DEBUG_TOOLBAR}}', this.getDebugToolbar());
      html = html.replace('{{DEBUG_PANELS}}', this.getDebugPanels());
      html = html.replace('{{DEBUG_FUNCTIONS}}', this.getDebugFunctions());
      html = html.replace('{{DEBUG_STATUS_UPDATE_CONNECTED}}', `
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.textContent = '* 연결됨';
                statusEl.className = 'status connected';
            }`);
      html = html.replace('{{DEBUG_STATUS_UPDATE_DISCONNECTED}}', `
            const statusEl = document.getElementById('status');
            if (statusEl) {
                statusEl.textContent = '* 연결끊김';
                statusEl.className = 'status disconnected';
            }`);
    } else {
      // 프로덕션 모드: 디버그 요소 제거
      html = html.replace('{{DEBUG_STYLES}}', '');
      html = html.replace('{{DEBUG_HEADER}}', '');
      html = html.replace('{{DEBUG_TOOLBAR}}', '');
      html = html.replace('{{DEBUG_PANELS}}', '');
      html = html.replace('{{DEBUG_FUNCTIONS}}', '');
      html = html.replace('{{DEBUG_STATUS_UPDATE_CONNECTED}}', '');
      html = html.replace('{{DEBUG_STATUS_UPDATE_DISCONNECTED}}', '');
    }

    return html;
  }
}

module.exports = TemplateRenderer;
