export interface AssetInfo {
  id: string;
  url: string;
  local: any;
  width: number;
  height: number;
  aspectRatio: number;
  name: string;
}

export const ASSETS = {
  asset1: {
    id: 'asset1',
    url: 'https://www.designarena.ai/u/f8efc362-1dff-4f6c-aaf2-c3cea831a6ae',
    local: require('../assets/reference/asset_1.png'),
    width: 941,
    height: 1672,
    aspectRatio: 1672 / 941,
    name: 'Login',
  },
  asset2: {
    id: 'asset2',
    url: 'https://www.designarena.ai/u/7f76850a-7647-43e2-9f81-d44ba117094c',
    local: require('../assets/reference/asset_2.png'),
    width: 874,
    height: 1800,
    aspectRatio: 1800 / 874,
    name: 'Início',
  },
  asset3: {
    id: 'asset3',
    url: 'https://www.designarena.ai/u/2b36a54f-96a6-403b-b29e-330e42b6029d',
    local: require('../assets/reference/asset_3.png'),
    width: 941,
    height: 1672,
    aspectRatio: 1672 / 941,
    name: 'Faça por mim',
  },
  asset4: {
    id: 'asset4',
    url: 'https://www.designarena.ai/u/2436a8e6-dc20-4496-b8a4-de08c5d0353c',
    local: require('../assets/reference/asset_4.png'),
    width: 872,
    height: 1804,
    aspectRatio: 1804 / 872,
    name: 'Conteúdo do Dia',
  },
  asset5: {
    id: 'asset5',
    url: 'https://www.designarena.ai/u/1c83a7fa-87b9-48b8-937e-b310d5b41254',
    local: require('../assets/reference/asset_5.png'),
    width: 873,
    height: 1801,
    aspectRatio: 1801 / 873,
    name: 'Meus Conteúdos',
  },
  asset6: {
    id: 'asset6',
    url: 'https://www.designarena.ai/u/d8f6c413-5a62-427f-89ae-8d6ae5e4e9e9',
    local: require('../assets/reference/asset_6.png'),
    width: 873,
    height: 1801,
    aspectRatio: 1801 / 873,
    name: 'Meu Trabalho',
  },
  asset7: {
    id: 'asset7',
    url: 'https://www.designarena.ai/u/21308d4b-ef01-424a-8c76-9c5bed0fa88d',
    local: require('../assets/reference/asset_7.png'),
    width: 873,
    height: 1802,
    aspectRatio: 1802 / 873,
    name: 'Perfil',
  },
  asset8: {
    id: 'asset8',
    url: 'https://www.designarena.ai/u/5390a164-8e75-4041-a43b-e5a0f494a8ef',
    local: require('../assets/reference/asset_8.png'),
    width: 873,
    height: 1801,
    aspectRatio: 1801 / 873,
    name: 'Comunidade Alpha',
  },
} as const;
