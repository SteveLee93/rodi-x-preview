/**
 * Rodi-X Preview Server 설정 파일
 *
 * 이 파일에서 모든 경로와 설정을 중앙 관리합니다.
 */

const path = require('path');

// ==========================================
// 🎯 기본 경로 설정
// ==========================================

/**
 * V3 프로젝트 루트 경로
 * 모든 경로의 기준점이 됩니다.
 */
const V3_ROOT = 'C:/git/v3/v3';

/**
 * Rodi 웹 서비스 경로
 * RodiX 컴포넌트의 실제 구현과 스타일이 있는 곳
 */
const RODI_WEB_SVC = path.join(V3_ROOT, 'src/rodi/code/services/rodi-web-svc/src');

/**
 * RodiX 컴포넌트 디렉토리
 * XButton, XInput 등의 실제 스타일 파일들이 있는 곳
 */
const RODIX_COMPONENTS_DIR = path.join(RODI_WEB_SVC, 'components/rodiXComponents');

/**
 * Atoms 컴포넌트 디렉토리
 * Button, Input 등 실제 UI 구현이 있는 곳
 */
const ATOMS_COMPONENTS_DIR = path.join(RODI_WEB_SVC, 'components/atoms');

/**
 * 스타일 변수 파일 경로
 */
const STYLES_DIR = path.join(RODI_WEB_SVC, 'styles');

// ==========================================
// 📁 프리뷰할 파일 설정
// ==========================================

/**
 * 프리뷰할 HTML 파일이 있는 폴더
 */
const HTML_FOLDER = path.join(V3_ROOT, 'src/rodi/code/plugins.debug/PID_Tuning_for_AMC_2/htmlStore');

/**
 * 프리뷰할 HTML 파일명
 */
const HTML_FILE = 'PIDTuningWidgetNode.html';

// ==========================================
// 🎨 스타일 컴포넌트 매핑
// ==========================================

/**
 * 전역 스타일 파일 (가장 먼저 로드되어야 함)
 */
const GLOBAL_STYLES = {
  'reset': path.join(STYLES_DIR, 'base/reset.scss'),
  'base': path.join(STYLES_DIR, 'base/all.scss'),
};

/**
 * Atoms 컴포넌트별 SCSS 파일 경로 매핑
 * 실제 UI 스타일이 구현된 곳
 */
const ATOMS_STYLES = {
  'Button': path.join(ATOMS_COMPONENTS_DIR, 'Button/Button.scss'),
  'Input': path.join(ATOMS_COMPONENTS_DIR, 'Input/Input.scss'),
  'Checkbox': path.join(ATOMS_COMPONENTS_DIR, 'Checkbox/Checkbox.scss'),
  'RadioButton': path.join(ATOMS_COMPONENTS_DIR, 'RadioButton/RadioButton.scss'),
  'Slider': path.join(ATOMS_COMPONENTS_DIR, 'Slider/Slider.scss'),
  'Cell': path.join(ATOMS_COMPONENTS_DIR, 'Cell/Cell.scss'),
  'TableList': path.join(ATOMS_COMPONENTS_DIR, 'TableList/TableList.scss'),
  'Paginate': path.join(ATOMS_COMPONENTS_DIR, 'Paginate/Paginate.scss'),
  'ToggleCheckBox': path.join(ATOMS_COMPONENTS_DIR, 'ToggleCheckBox/ToggleCheckBox.scss'),
};

/**
 * RodiX 컴포넌트별 SCSS 파일 경로 매핑
 * 각 컴포넌트의 추가 스타일 (visible-show/hide 등)
 */
const RODIX_STYLES = {
  'XButton': path.join(RODIX_COMPONENTS_DIR, 'XButton/XButton.scss'),
  'XInput': path.join(RODIX_COMPONENTS_DIR, 'XInput/XInput.scss'),
  'XLabel': path.join(RODIX_COMPONENTS_DIR, 'XLabel/XLabel.scss'),
  'XSpan': path.join(RODIX_COMPONENTS_DIR, 'XSpan/XSpan.scss'),
  'XDiv': path.join(RODIX_COMPONENTS_DIR, 'XDiv/XDiv.scss'),
  'XImage': path.join(RODIX_COMPONENTS_DIR, 'XImage/XImage.scss'),
  'XCheckBox': path.join(RODIX_COMPONENTS_DIR, 'XCheckBox/XCheckBox.scss'),
  'XRadio': path.join(RODIX_COMPONENTS_DIR, 'XRadio/XRadio.scss'),
  'XSlider': path.join(RODIX_COMPONENTS_DIR, 'XSlider/XSlider.scss'),
  'XSelectBox': path.join(RODIX_COMPONENTS_DIR, 'XSelectBox/XSelectBox.scss'),
  'XPaginate': path.join(RODIX_COMPONENTS_DIR, 'XPaginate/XPaginate.scss'),
  'XToggleCheckBox': path.join(RODIX_COMPONENTS_DIR, 'XToggleCheckBox/XToggleCheckBox.scss'),
};

// ==========================================
// ⚙️ 서버 설정
// ==========================================

const SERVER_CONFIG = {
  port: 3333,
  host: 'localhost',

  // 파일 감시 설정
  watch: {
    // HTML 파일 변경 감지 안정화 시간 (ms)
    stabilityThreshold: 200,
    // 파일 변경 폴링 간격 (ms)
    pollInterval: 100,
  },

  // Socket.IO 설정
  socketIO: {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  }
};

// ==========================================
// 📤 Export
// ==========================================

module.exports = {
  // 경로
  V3_ROOT,
  RODI_WEB_SVC,
  RODIX_COMPONENTS_DIR,
  ATOMS_COMPONENTS_DIR,
  STYLES_DIR,
  HTML_FOLDER,
  HTML_FILE,

  // 스타일
  GLOBAL_STYLES,
  ATOMS_STYLES,
  RODIX_STYLES,

  // 설정
  SERVER_CONFIG,

  // 헬퍼 함수
  getHtmlFilePath: () => path.join(HTML_FOLDER, HTML_FILE),

  /**
   * 특정 플러그인의 HTML 파일 경로 반환
   * @param {string} pluginName - 플러그인 이름
   * @param {string} fileName - HTML 파일명
   */
  getPluginHtmlPath: (pluginName, fileName) => {
    return path.join(V3_ROOT, `src/rodi/code/plugins.debug/${pluginName}/htmlStore/${fileName}`);
  },

  /**
   * 설정 유효성 검증
   */
  validate: () => {
    const fs = require('fs');
    const errors = [];

    if (!fs.existsSync(V3_ROOT)) {
      errors.push(`V3_ROOT 경로를 찾을 수 없습니다: ${V3_ROOT}`);
    }

    if (!fs.existsSync(RODIX_COMPONENTS_DIR)) {
      errors.push(`RodiX 컴포넌트 디렉토리를 찾을 수 없습니다: ${RODIX_COMPONENTS_DIR}`);
    }

    if (!fs.existsSync(HTML_FOLDER)) {
      errors.push(`HTML 폴더를 찾을 수 없습니다: ${HTML_FOLDER}`);
    }

    const htmlPath = path.join(HTML_FOLDER, HTML_FILE);
    if (!fs.existsSync(htmlPath)) {
      errors.push(`HTML 파일을 찾을 수 없습니다: ${htmlPath}`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};