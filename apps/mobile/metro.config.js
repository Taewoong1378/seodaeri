const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 모노레포 루트도 watch
config.watchFolders = [workspaceRoot];

// React 관련 패키지는 반드시 mobile의 node_modules에서 가져오도록 강제
const mobileNodeModules = path.resolve(projectRoot, 'node_modules');
const rootNodeModules = path.resolve(workspaceRoot, 'node_modules');

// 커스텀 resolver로 React 버전 충돌 방지
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // React 관련 모듈은 항상 mobile의 node_modules에서 resolve
  if (
    moduleName === 'react' ||
    moduleName === 'react-native' ||
    moduleName.startsWith('react/') ||
    moduleName.startsWith('react-native/')
  ) {
    const mobilePath = path.join(mobileNodeModules, moduleName);
    try {
      // mobile node_modules에서 찾기
      return {
        filePath: require.resolve(moduleName, { paths: [mobileNodeModules] }),
        type: 'sourceFile',
      };
    } catch (e) {
      // 실패하면 기본 resolver 사용
    }
  }
  
  // 기본 resolver 사용
  return context.resolveRequest(context, moduleName, platform);
};

// node_modules 검색 순서: mobile 먼저, 그 다음 root
config.resolver.nodeModulesPaths = [
  mobileNodeModules,
  rootNodeModules,
];

module.exports = config;
