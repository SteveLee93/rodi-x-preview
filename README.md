# 🚀 Rodi-X Preview Server

> V3 커스텀 컴포넌트 실시간 개발 도구

V3 프로젝트의 커스텀 Rodi-X 컴포넌트(`<XButton>`, `<XInput>` 등)를 브라우저에서 실시간으로 프리뷰하고 테스트할 수 있는 개발 서버입니다.

## 🎯 왜 필요한가?

### 문제 상황
```
V3 프로젝트는 <XButton>, <XInput> 같은 커스텀 컴포넌트 사용
    ↓
브라우저는 커스텀 태그를 이해하지 못함
    ↓
전체 프로젝트를 빌드해야만 확인 가능 (3-5분 소요)
    ↓
개발 속도 저하 😢
```

### 해결책
```
실시간 변환 서버로 즉시 확인! ⚡
    ↓
HTML 저장 → 0.2초 후 브라우저 자동 새로고침
    ↓
개발 속도 90% 향상! 🎉
```

## ✨ 주요 기능

### 1️⃣ 실시간 컴포넌트 변환
```html
<!-- Rodi-X 커스텀 컴포넌트 -->
<XButton id="btn1">Click Me</XButton>

↓ 자동 변환

<!-- 표준 HTML -->
<button id="btn1" class="btn">Click Me</button>
```

### 2️⃣ 실제 V3 스타일 적용
- V3 프로젝트의 **실제 SCSS 파일**을 직접 컴파일
- 운영 환경과 **100% 동일한 스타일** 적용
- 별도 설정 불필요 (자동 감지)

### 3️⃣ Hot Reload (실시간 새로고침)
- HTML 파일 수정 감지
- SCSS 파일 수정 감지
- 자동으로 브라우저 새로고침
- **0.2초** 내에 변경사항 확인


## 📦 빠른 시작

### 1. 설치
```bash
npm install
```

### 2. 설정
`config.js` 파일에서 경로 설정:

```javascript
// V3 프로젝트 루트 경로
const V3_ROOT = 'C:/git/v3';

// 프리뷰할 HTML 파일 설정
const HTML_FOLDER = path.join(V3_ROOT,
  'src/rodi/app/plugins/1.samples/source/Components/htmlStore');
const HTML_FILE = 'componentsExtensionNode.html';
```

### 3. 실행
```bash
npm start
```

### 4. 브라우저에서 확인
```
http://localhost:3333
```

## 📁 프로젝트 구조

```
rodi-x-preview/
│
├── 🎨 프론트엔드
│   ├── template.html              # HTML 템플릿
│   └── rodiXEmulator.js           # 컴포넌트 동작 에뮬레이터
│
├── ⚙️ 백엔드
│   ├── server.js                  # Express 서버 (434 라인)
│   ├── config.js                  # 중앙 설정 관리
│   ├── rodiConverter-simple.js    # HTML 변환기
│   ├── styleLoader.js             # SCSS → CSS 컴파일러
│   ├── templateRenderer.js        # 템플릿 렌더링
│   └── pluginLoader.js            # 플러그인 JavaScript 로더
│
└── 📦 기타
    ├── package.json
    └── README.md
```

## 🔧 주요 기술 스택

| 카테고리 | 기술 | 용도 |
|---------|------|------|
| **서버** | Express.js | HTTP 서버 |
| **실시간 통신** | Socket.IO | 파일 변경 알림 |
| **파일 감시** | Chokidar | HTML/SCSS 변경 감지 |
| **스타일 컴파일** | sass (dart-sass) | SCSS → CSS 변환 |
| **HTML 파싱** | Cheerio | 커스텀 컴포넌트 변환 |
| **템플릿** | Custom Template Engine | 동적 HTML 생성 |

## 💡 핵심 기술

### 1. 스타일 캐싱 시스템
```javascript
// 서버 시작 시 한 번만 SCSS 컴파일
cachedStyles = styleLoader.loadAllStyles();

// 요청 시 캐시 사용 (매우 빠름)
const styles = cachedStyles;
```

### 2. 템플릿 시스템
```javascript
// 1,095 라인의 인라인 HTML → 템플릿 분리
const html = templateRenderer.render({
  fileName,
  rodiXStyles,
  convertedHtml,
  pluginJS,
  debugMode: true
});
```

### 3. 실시간 파일 감시
```javascript
// HTML, JavaScript, SCSS 모두 감시
chokidar.watch([
  '*.html',
  '*.js',
  'components/**/*.scss',
  'styles/**/*.scss'
]);
```