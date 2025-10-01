/**
 * V3 플러그인 로더
 *
 * 플러그인 디렉토리에서 JS 파일을 읽어서 이벤트 핸들러를 추출하고
 * 프리뷰 서버에서 실행 가능한 JavaScript로 변환합니다.
 */

const fs = require('fs');
const path = require('path');

class PluginLoader {
  constructor(pluginPath) {
    this.pluginPath = pluginPath;
    this.contributionFile = null;
    this.serviceFile = null;
    this.eventHandlers = new Map();
    this.pluginCode = '';
  }

  /**
   * 플러그인 로드 - JS 파일들을 분석
   */
  load() {
    console.log('\n📦 플러그인 로딩 시작:', this.pluginPath);

    // Contribution 파일 찾기
    const files = fs.readdirSync(this.pluginPath);
    this.contributionFile = files.find(f =>
      f.includes('Contribution.js') || f.includes('contribution.js')
    );
    this.serviceFile = files.find(f =>
      f.includes('Service.js') || f.includes('service.js')
    );

    if (!this.contributionFile) {
      console.warn('⚠️  Contribution 파일을 찾을 수 없습니다');
      return null;
    }

    console.log(`  ✅ Contribution: ${this.contributionFile}`);
    if (this.serviceFile) {
      console.log(`  ✅ Service: ${this.serviceFile}`);
    }

    // JS 파일 읽기 및 분석
    return this.parseContributionFile();
  }

  /**
   * Contribution 파일 파싱 - 이벤트 핸들러 추출
   */
  parseContributionFile() {
    const filePath = path.join(this.pluginPath, this.contributionFile);
    const content = fs.readFileSync(filePath, 'utf8');

    // 이벤트 바인딩 패턴 추출
    const eventBindings = this.extractEventBindings(content);

    // 핸들러 함수 추출
    const handlers = this.extractHandlers(content);

    // 데이터 및 초기화 함수 추출
    const initFunctions = this.extractInitFunctions(content);

    console.log(`\n📋 추출 결과:`);
    console.log(`  - 이벤트 바인딩: ${eventBindings.length}개`);
    console.log(`  - 핸들러 함수: ${handlers.length}개`);
    console.log(`  - 초기화 함수: ${initFunctions.length}개`);

    return {
      eventBindings,
      handlers,
      initFunctions,
      rawCode: content
    };
  }

  /**
   * 이벤트 바인딩 추출
   * 예: this.uiHandler.on('btnComponents', this.handleClickBtnComponents.bind(this));
   */
  extractEventBindings(content) {
    const bindings = [];

    // uiHandler.on 패턴 매칭
    const onPattern = /this\.uiHandler\.on\(['"]([^'"]+)['"],\s*this\.(\w+)\.bind\(this\)\)/g;
    let match;

    while ((match = onPattern.exec(content)) !== null) {
      const [, componentId, handlerName] = match;
      bindings.push({
        componentId,
        handlerName,
        type: 'uiHandler.on'
      });
    }

    return bindings;
  }

  /**
   * 핸들러 함수 추출
   */
  extractHandlers(content) {
    const handlers = [];

    // 메서드 정의 패턴 매칭
    const methodPattern = /^\s*(handle\w+|on\w+)\s*\([^)]*\)\s*\{/gm;
    let match;

    while ((match = methodPattern.exec(content)) !== null) {
      const methodName = match[1];
      const startPos = match.index;

      // 함수 본문 추출 (간단한 중괄호 매칭)
      const body = this.extractFunctionBody(content, startPos);

      handlers.push({
        name: methodName,
        body,
        startPos
      });
    }

    return handlers;
  }

  /**
   * 함수 본문 추출 (중괄호 매칭)
   */
  extractFunctionBody(content, startPos) {
    let depth = 0;
    let start = -1;
    let end = -1;

    for (let i = startPos; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        if (depth === 0) start = i;
        depth++;
      } else if (char === '}') {
        depth--;
        if (depth === 0) {
          end = i + 1;
          break;
        }
      }
    }

    if (start !== -1 && end !== -1) {
      return content.substring(start, end);
    }
    return '';
  }

  /**
   * 초기화 함수 추출 (_init 패턴)
   */
  extractInitFunctions(content) {
    const initFuncs = [];

    const initPattern = /^\s*(_\w+)\s*\([^)]*\)\s*\{/gm;
    let match;

    while ((match = initPattern.exec(content)) !== null) {
      const funcName = match[1];
      const startPos = match.index;
      const body = this.extractFunctionBody(content, startPos);

      initFuncs.push({
        name: funcName,
        body,
        startPos
      });
    }

    return initFuncs;
  }

  /**
   * 브라우저 실행 가능한 JavaScript로 변환
   */
  convertToBrowserJS(pluginData) {
    if (!pluginData) return '';

    const { eventBindings, handlers, initFunctions } = pluginData;

    let browserJS = `
// ============================================
// V3 플러그인 에뮬레이션: ${this.contributionFile}
// ============================================

class PluginEmulator {
  constructor() {
    this.components = {};
    this.rodiX = window.rodiX; // RodiXEmulator 인스턴스
    this.data = {};

    // 모든 ID 있는 요소를 components에 등록
    document.querySelectorAll('[id]').forEach(el => {
      this.components[el.id] = el;
    });

    console.log('🎮 플러그인 에뮬레이터 초기화');
    this.init();
  }

  init() {
`;

    // 초기화 함수 호출 추가
    initFunctions.forEach(func => {
      if (func.name.startsWith('_init')) {
        browserJS += `    this.${func.name}();\n`;
      }
    });

    // 이벤트 바인딩 추가
    eventBindings.forEach(binding => {
      const { componentId, handlerName } = binding;

      browserJS += `
    // ${componentId} 이벤트 연결
    const component = this.components['${componentId}'];

    if (window.rodiX && typeof window.rodiX.registerHandler === 'function') {
      window.rodiX.registerHandler('${componentId}', (type, payload = {}) => {
        this.${handlerName}(type, payload);
      });
    }

    if (component) {
      const emit = (type, payload = {}) => this.${handlerName}(type, payload);

      component.addEventListener('click', (e) => emit('click', { value: e.target.value }));
      component.addEventListener('change', (e) => emit('change', { value: e.target.value }));
      component.addEventListener('rodix-select', (e) => emit('select', e.detail || {}));
    }
`;
    });

    browserJS += `  }\n\n`;

    // 핸들러 함수들을 브라우저용으로 변환
    handlers.forEach(handler => {
      browserJS += this.convertHandlerToBrowserJS(handler);
    });

    // 초기화 함수들을 브라우저용으로 변환
    initFunctions.forEach(func => {
      browserJS += this.convertHandlerToBrowserJS(func);
    });

    browserJS += `}

// 플러그인 에뮬레이터 자동 실행
if (window.rodiX) {
  window.pluginEmulator = new PluginEmulator();
}
`;

    return browserJS;
  }

  /**
   * 핸들러 함수를 브라우저용 JavaScript로 변환
   */
  convertHandlerToBrowserJS(handler) {
    let body = handler.body;

    // RodiX API 호출을 브라우저 API로 변환
    body = body
      // setClassName → className =
      .replace(/this\.components\.(\w+)\.setClassName\(['"]([^'"]+)['"]\)/g,
        'this.components.$1.className = "$2"')

      // setVisible → style.display =
      .replace(/this\.components\.(\w+)\.setVisible\((true|false)\)/g,
        (match, id, visible) =>
          `this.components.${id}.style.display = ${visible} ? 'block' : 'none'`)

      // render() 제거 (브라우저는 자동 렌더링)
      .replace(/this\.uiHandler\.render\(\);?/g, '')

      // MessageBox.show → alert
      .replace(/this\.rodiAPI\.getUserInteraction\(\)\.MessageBox\.show\([^,]+,\s*([^,]+),\s*([^,]+)[^)]*\)/g,
        'alert($2 + "\\n\\n" + $1)')

      // components 접근 간소화
      .replace(/this\.components\.(\w+)\./g, 'this.components.$1.');

    return `
  ${handler.name}(type, data) ${body}
`;
  }

  /**
   * 플러그인 정보 가져오기
   */
  getPluginInfo() {
    const packagePath = path.join(this.pluginPath, 'package.json');
    if (fs.existsSync(packagePath)) {
      try {
        return JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      } catch (error) {
        console.warn('⚠️  package.json 파싱 실패:', error.message);
      }
    }
    return null;
  }
}

module.exports = PluginLoader;
