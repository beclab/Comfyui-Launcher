import superagent from 'superagent';
import { logger } from '../utils/logger';
import { Context } from 'koa';

const CIVITAI_API_BASE_URL = 'https://civitai.com/api/v1';

// 在文件顶部添加接口定义
interface SuperAgentError extends Error {
  status?: number;
  response?: {
    body?: {
      message?: string;
    };
  };
}

export class CivitaiController {
  
  /**
   * 获取最新模型
   * @param ctx Koa上下文对象
   */
  async getLatestModels(ctx: Context): Promise<void> {
    try {
      const limit = ctx.query.limit ? parseInt(ctx.query.limit as string) : 12;
      const page = ctx.query.page ? parseInt(ctx.query.page as string) : 1;
      const cursor = ctx.query.cursor as string | undefined;
      
      // 构建API请求URL，sort=Newest 获取最新模型
      const url = `${CIVITAI_API_BASE_URL}/models`;
      
      // 构建查询参数
      const queryParams: any = {
        limit,
        sort: 'Newest',
        period: 'AllTime',
        nsfw: false // 默认不包含NSFW内容
      };
      
      // 如果提供了cursor，优先使用cursor分页
      if (cursor) {
        queryParams.cursor = cursor;
      } else {
        queryParams.page = page;
      }
      
      const response = await superagent
        .get(url)
        .query(queryParams);
      
      ctx.body = response.body;
    } catch (error) {
      logger.error('获取最新模型失败:', error);
      
      // 添加类型断言
      const err = error as SuperAgentError;
      
      if (err.response) {
        const statusCode = err.status || 500;
        const errorMessage = err.response.body?.message || '获取最新模型时发生错误';
        
        ctx.status = statusCode;
        ctx.body = {
          error: true,
          message: errorMessage
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          error: true,
          message: '服务器内部错误'
        };
      }
    }
  }

  /**
   * 获取热门模型
   * @param ctx Koa上下文对象
   */
  async getHotModels(ctx: Context): Promise<void> {
    try {
      const limit = ctx.query.limit ? parseInt(ctx.query.limit as string) : 24;
      const page = ctx.query.page ? parseInt(ctx.query.page as string) : 1;
      
      const url = `${CIVITAI_API_BASE_URL}/models`;
      
      const response = await superagent
        .get(url)
        .query({
          limit,
          page,
          sort: 'Most Downloaded',
          period: 'Month',
          nsfw: false
        });
      
      ctx.body = response.body;
    } catch (error) {
      logger.error('获取热门模型失败:', error);
      
      // 添加类型断言
      const err = error as SuperAgentError;
      
      if (err.response) {
        ctx.status = err.status || 500;
        ctx.body = {
          error: true,
          message: err.response.body?.message || '获取热门模型时发生错误'
        };
      } else {
        ctx.status = 500;
        ctx.body = { error: true, message: '服务器内部错误' };
      }
    }
  }

  /**
   * 获取特定模型的详细信息
   * @param ctx Koa上下文对象
   */
  async getModelDetails(ctx: Context): Promise<void> {
    try {
      const modelId = ctx.params.id;
      
      if (!modelId) {
        ctx.status = 400;
        ctx.body = {
          error: true,
          message: '缺少模型ID'
        };
        return;
      }
      
      const url = `${CIVITAI_API_BASE_URL}/models/${modelId}`;
      
      const response = await superagent.get(url);
      ctx.body = response.body;
    } catch (error) {
      logger.error('获取模型详情失败:', error);
      
      // 添加类型断言
      const err = error as SuperAgentError;
      
      if (err.response) {
        const statusCode = err.status || 500;
        const errorMessage = err.response.body?.message || '获取模型详情时发生错误';
        
        ctx.status = statusCode;
        ctx.body = {
          error: true,
          message: errorMessage
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          error: true,
          message: '服务器内部错误'
        };
      }
    }
  }
  
  /**
   * 下载模型文件
   * @param ctx Koa上下文对象
   */
  async downloadModel(ctx: Context): Promise<void> {
    try {
      const modelVersionId = ctx.params.versionId;
      
      if (!modelVersionId) {
        ctx.status = 400;
        ctx.body = {
          error: true,
          message: '缺少模型版本ID'
        };
        return;
      }
      
      // 使用Civitai的下载API
      const downloadUrl = `${CIVITAI_API_BASE_URL}/download/models/${modelVersionId}`;
      
      // 流式传输下载需要特殊处理Koa响应
      ctx.body = superagent.get(downloadUrl);
      
      // 设置headers会从响应中获取
      ctx.set('Content-Type', 'application/octet-stream');
    } catch (error) {
      logger.error('下载模型失败:', error);
      
      // 添加类型断言
      const err = error as SuperAgentError;
      
      if (err.response) {
        const statusCode = err.status || 500;
        const errorMessage = err.response.body?.message || '下载模型时发生错误';
        
        ctx.status = statusCode;
        ctx.body = {
          error: true,
          message: errorMessage
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          error: true,
          message: '服务器内部错误'
        };
      }
    }
  }

  /**
   * 使用完整URL获取模型
   */
  async getLatestModelsByUrl(ctx: Context): Promise<void> {
    try {
      const fullUrl = ctx.query.url as string;
      
      if (!fullUrl) {
        ctx.status = 400;
        ctx.body = {
          error: true,
          message: '缺少URL参数'
        };
        return;
      }
      
      // 解析URL提取所需参数
      let parsedUrl;
      try {
        parsedUrl = new URL(fullUrl);
      } catch (error) {
        ctx.status = 400;
        ctx.body = {
          error: true,
          message: 'URL格式无效'
        };
        return;
      }
      
      // 从URL中提取查询参数
      const params = Object.fromEntries(parsedUrl.searchParams.entries());
      
      // 构建新请求到Civitai API
      const url = `${CIVITAI_API_BASE_URL}/models`;
      
      logger.info(`通过解析参数请求下一页: ${JSON.stringify(params)}`);
      
      const response = await superagent
        .get(url)
        .query(params);
      
      ctx.body = response.body;
    } catch (error) {
      logger.error('使用完整URL获取模型失败:', error);
      
      const err = error as SuperAgentError;
      
      if (err.response) {
        const statusCode = err.status || 500;
        const errorMessage = err.response.body?.message || '使用完整URL获取模型时发生错误';
        
        ctx.status = statusCode;
        ctx.body = {
          error: true,
          message: errorMessage
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          error: true,
          message: '服务器内部错误'
        };
      }
    }
  }

  /**
   * 获取最新工作流
   * @param ctx Koa上下文对象
   */
  async getLatestWorkflows(ctx: Context): Promise<void> {
    try {
      // 获取查询参数并确保它们是单个值
      const limit = typeof ctx.query.limit === 'string' ? parseInt(ctx.query.limit) : 24;
      const page = typeof ctx.query.page === 'string' ? parseInt(ctx.query.page) : 1;
      const cursor = typeof ctx.query.cursor === 'string' ? ctx.query.cursor : undefined;
      
      // 构建Civitai API请求URL，使用types查询参数而不是路径
      let apiUrl = `${CIVITAI_API_BASE_URL}/models`;
      
      // 构建查询参数对象
      const queryParams: Record<string, string | number | boolean> = {
        limit,
        types: 'Workflows',
        sort: 'Newest',
        nsfw: false
      };
      
      // 处理分页
      if (cursor) {
        queryParams.cursor = cursor;
      } else {
        queryParams.page = page;
      }
      
      logger.info(`获取工作流，参数: ${JSON.stringify(queryParams)}`);
      
    //   发起请求并返回结果
      const response = await superagent
        .get(apiUrl)
        .query(queryParams);
      
      ctx.body = response.body;
    } catch (error) {
      logger.error('获取最新工作流失败:', error);
      
      // 处理错误响应
      const err = error as SuperAgentError;
      
      if (err.response) {
        const statusCode = err.status || 500;
        const errorMessage = err.response.body?.message || '获取最新工作流时发生错误';
        
        ctx.status = statusCode;
        ctx.body = {
          error: true,
          message: errorMessage
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          error: true,
          message: '服务器内部错误'
        };
      }
    }
  }

  /**
   * 获取热门工作流
   * @param ctx Koa上下文对象
   */
  async getHotWorkflows(ctx: Context): Promise<void> {
    try {
      // 获取查询参数并确保它们是单个值
      const limit = typeof ctx.query.limit === 'string' ? parseInt(ctx.query.limit) : 24;
      const page = typeof ctx.query.page === 'string' ? parseInt(ctx.query.page) : 1;
      const cursor = typeof ctx.query.cursor === 'string' ? ctx.query.cursor : undefined;
      
      // 构建Civitai API请求URL
      let apiUrl = `${CIVITAI_API_BASE_URL}/models`;
      
      // 构建查询参数对象
      const queryParams: Record<string, string | number | boolean> = {
        limit,
        types: 'Workflows',
        sort: 'Most Downloaded',
        period: 'Month',
        nsfw: false
      };
      
      // 处理分页
      if (cursor) {
        queryParams.cursor = cursor;
      } else {
        queryParams.page = page;
      }
      
      logger.info(`获取热门工作流，参数: ${JSON.stringify(queryParams)}`);
      
      // 发起请求并返回结果
      const response = await superagent
        .get(apiUrl)
        .query(queryParams);
      
      ctx.body = response.body;
    } catch (error) {
      logger.error('获取热门工作流失败:', error);
      
      // 处理错误响应
      const err = error as SuperAgentError;
      
      if (err.response) {
        const statusCode = err.status || 500;
        const errorMessage = err.response.body?.message || '获取热门工作流时发生错误';
        
        ctx.status = statusCode;
        ctx.body = {
          error: true,
          message: errorMessage
        };
      } else {
        ctx.status = 500;
        ctx.body = {
          error: true,
          message: '服务器内部错误'
        };
      }
    }
  }
}

export default new CivitaiController();
