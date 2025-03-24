// 声明vue-waterfall2模块及其类型
declare module 'vue-waterfall2' {
  import { DefineComponent } from 'vue';
  
  // 定义waterfall组件的props
  interface WaterfallProps {
    col?: number;          // 列数
    data?: unknown[];      // 瀑布流数据，使用unknown代替any
    gutterWidth?: number;  // 列间距
    'key-name'?: string;   // 唯一标识符字段名
  }
  
  // 声明waterfall组件
  const waterfall: DefineComponent<
    WaterfallProps, 
    Record<string, never>,  // 使用Record<string, never>代替{}
    unknown                 // 使用unknown代替any
  >;
  
  // 默认导出waterfall组件
  export default waterfall;
} 