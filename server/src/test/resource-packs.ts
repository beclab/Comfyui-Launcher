/**
 * 资源包测试数据
 * 包含四种类型的资源各一个
 */
import { ResourcePack, ResourceType } from '../controllers/resource-packs.controller';

// 测试用资源包数据
export const testResourcePack: ResourcePack = {
  id: 'test-resource-pack',
  name: '测试资源包',
  description: '包含四种类型资源的测试包',
  author: 'Admin',
  version: '1.0.0',
  tags: ['测试', 'demo'],
  resources: [
    // 模型资源
    {
      id: 'test-model',
      name: '测试模型',
      type: ResourceType.MODEL,
      description: '用于测试的小型模型',
      url: {
        mirror: 'https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/diffusion_pytorch_model.safetensors',
        hf: 'https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/diffusion_pytorch_model.safetensors'
      },
      dir: 'test',
      out: 'test-model.safetensors',
      optional: false
    },
    
    // 插件资源
    {
      id: 'test-plugin',
      name: '测试插件',
      type: ResourceType.PLUGIN,
      description: '用于测试的简单插件',
      github: 'https://github.com/comfyanonymous/ComfyUI-Manager',
      branch: 'main',
      optional: true
    },
    
    // 工作流资源
    {
      id: 'test-workflow',
      name: '测试工作流',
      type: ResourceType.WORKFLOW,
      description: '简单的测试工作流',
      url: 'https://raw.githubusercontent.com/comfyanonymous/ComfyUI_examples/master/example_simple.json',
      filename: 'test-workflow.json',
      optional: false
    },
    
    // 自定义资源
    {
      id: 'test-custom-resource',
      name: '测试自定义资源',
      type: ResourceType.CUSTOM,
      description: '测试用的自定义资源文件',
      url: 'https://raw.githubusercontent.com/comfyanonymous/ComfyUI/master/README.md',
      destination: 'custom/test-readme.md',
      optional: true
    }
  ]
};

// 最小资源包测试数据
export const minimalResourcePack: ResourcePack = {
  id: 'minimal-pack',
  name: '最小资源包',
  description: '仅包含必要资源的最小测试包',
  resources: [
    {
      id: 'minimal-model',
      name: '最小测试模型',
      type: ResourceType.MODEL,
      url: 'https://huggingface.co/stabilityai/sd-vae-ft-mse-original/resolve/main/diffusion_pytorch_model.safetensors',
      dir: 'minimal',
      out: 'minimal-model.safetensors'
    }
  ]
};

// 中文资源包测试数据
export const chineseResourcePack: ResourcePack = {
  id: 'chinese-pack',
  name: '中文资源包',
  description: '包含中文内容的测试资源包',
  author: '测试用户',
  version: '1.0.0',
  tags: ['中文', '测试'],
  resources: [
    {
      id: 'cn-workflow',
      name: '中文工作流',
      type: ResourceType.WORKFLOW,
      description: '测试用中文工作流',
      url: 'https://raw.githubusercontent.com/comfyanonymous/ComfyUI_examples/master/example_simple.json',
      filename: '中文工作流.json',
      optional: false
    },
    {
      id: 'cn-custom',
      name: '中文自定义资源',
      type: ResourceType.CUSTOM,
      description: '中文测试自定义资源',
      url: 'https://raw.githubusercontent.com/comfyanonymous/ComfyUI/master/README.md',
      destination: '自定义/中文说明.md',
      optional: true
    }
  ]
};

// 导出测试数据数组
export const testResourcePacks = [
  testResourcePack,
  minimalResourcePack,
  chineseResourcePack
];
