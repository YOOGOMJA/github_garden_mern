# 정원사 프로젝트

[![MIT License](https://img.shields.io/apm/l/atomic-design-ui.svg?)](https://github.com/tterb/atomic-design-ui/blob/master/LICENSEs)
[![Version](https://badge.fury.io/gh/tterb%2FHyde.svg)](https://badge.fury.io/gh/tterb%2FHyde)

## 1. 기능

'정원사 프로젝트'의 `nodejs`, `mongodb`, `express`, `react` 사용 프로젝트 입니다.
정원사 프로젝트의 `도전 기간`을 추가한 후, 깃허브 계정을 추가하면 `github API`를 이용해 데이터를 수집, 저장합니다.
기본적으로 6시간마다 크롤러가 작동하고, 개인 별로 추가 조회할 수 있습니다.

## 2. 설치

### 2.1. 필수 요소

-   [x] docker
-   [x] nodejs
-   [x] nodemon

## 3. 보안 파일 항목

본 프로젝트는 `db` 폴더에 `config.json`파일을 필요로 합니다. 현재 해당 파일에는 API 호스트 주소, github API 토큰 등을 필요로 합니다.

github 토큰은 미리 생성 후 추가해주어야 하며 아래의 주소에서 생성할 수 있습니다.
[토큰 생성 주소](https://github.com/settings/tokens)

```javascript
// config.json 예제
{
  "host" :{
    // 외부 mongodb를 사용할 때에는 수정해야합니다
    // 기본적으로는 docker내에서 요청 할 주소가 등록됩니다
    "production" : "mongodb://mongodb:27017/DOCUMENTS_NAME",
    // 개발 서버는 localhost로 접속됩니다.
    "development" : "mongodb://localhost:27017/DOCUMENTS_NAME",
  },
  // 별도로 발급받아야 합니다
  "github_api_token" : "YOUR_TOKEN"
}
```

## 4. API

모든 API의 응답 형태는 일괄적인 형태를 띕니다. 응답의 기본 형태는 다음과 같습니다.

```typescript
interface GitFarmResponseInterface {
    code: number; // 응답 번호입니다. 양수인 경우 성공, 음수인 경우 오류입니다.
    status: string; // 응답 상태를 문자열로 출력합니다. 성공은 'SUCCESS' 실패는 'FAIL' 로 출력됩니다.
    message: string; // 응답 상태에 대한 상세한 정보를 메시지로 출력합니다.
    data?: any; // 응답이 성공했을 때, 데이터를 반환할 경우 포함됩니다.
    error?: any; // 응답이 실패했을 때, 에러를 포함합니다.
}
```

다음은 `/api/users/:user_name`의 결과물 예제입니다.

```json
{
    "code": 1,
    "status": "SUCCESS",
    "message": "조회에 성공했습니다",
    "data": {
        "_id": "5ebeb22cc6163456d41d2c61",
        "id": 15305733,
        "login": "yoogomja",
        "html_url": "https://github.com/YOOGOMJA",
        "name": "KyeongSoo Yoo",
        "blog": "http://yoogomja.github.io",
        "email": null,
        "bio": "91. S.Korea \r\nSAHMYOOK univ. Computer Science dept.\r\n\r\nWeb / iOS Programmer",
        "api_url": "https://api.github.com/users/YOOGOMJA",
        "events_url": "https://api.github.com/users/YOOGOMJA/events{/privacy}",
        "__v": 0
    }
}
```

모든 API 명세는 [여기](https://github.com/YOOGOMJA/github_garden_mern/wiki/2.0.API/)에서 확인할 수 있습니다.
