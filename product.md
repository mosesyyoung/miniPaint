# miniPaint 项目梳理

## 1. 项目概览

miniPaint 是一个运行在浏览器端的在线图片编辑器，核心能力基于 HTML5 Canvas、JavaScript 和前端本地存储实现。项目目标是提供类似轻量 Photoshop/GIMP 的图片创建、编辑、图层、滤镜、绘制工具和导入导出能力。

项目特点：

- 单页前端应用，入口页面为 `index.html`，入口脚本为 `src/js/main.js`，构建产物输出到 `dist/bundle.js`。
- 图片处理主要在浏览器内完成，README 明确说明图片不会上传到服务器。
- 使用多图层模型，支持矢量对象层、位图层、选择区、撤销/重做历史。
- 菜单、工具栏、右侧面板等 UI 由 JavaScript 动态渲染。
- 支持多语言 JSON 字典和一个 PHP 翻译辅助工具。

## 2. 技术栈信息

### 前端基础

- HTML5：`index.html` 提供应用外壳、Canvas 容器、菜单、工具栏、图层面板等 DOM 挂载点。
- CSS：`src/css` 下维护 reset、布局、菜单、组件、打印等样式。
- JavaScript ES Modules：源码在 `src/js` 下，通过 `import/export` 组织模块。
- HTML5 Canvas 2D：核心绘制、滤镜预览、图层合成、工具绘制都围绕 Canvas。
- Web APIs：使用 Clipboard、FileReader、Drag and Drop、IndexedDB、localStorage/cookie、Fullscreen、Canvas Blob/DataURL、Web Workers 等浏览器能力。

### 构建工具

- Webpack 5：`webpack.config.js` 定义入口、输出、loader、devServer。
- Babel：`.babelrc` 使用 `@babel/preset-env` 和 `@babel/plugin-transform-runtime` 兼容旧浏览器语法。
- webpack-dev-server：`npm run server` 启动开发服务器。
- CSS Loader / Style Loader：CSS 由 JS 入口引入并打入 bundle。

### 主要依赖

- `jquery`：DOM 操作和部分插件依赖。
- `alertifyjs`：提示、确认、弹窗通知。
- `file-saver`：文件保存下载。
- `blueimp-canvas-to-blob`：Canvas 转 Blob 兼容支持。
- `exif-js`：读取图片 EXIF 信息。
- `gif.js.optimized` / `src/js/libs/gifjs`：生成 GIF 动画。
- `pica`、`hermite-resize`：图片缩放/重采样。
- `fuzzysort`：搜索/模糊匹配。
- `uuid`：生成唯一 ID。
- `webfontloader`：加载 Web 字体。
- `semver-compare`：版本号比较。

### 脚本命令

- `npm run server`：以开发模式启动 webpack-dev-server 并打开浏览器。
- `npm run dev`：开发模式构建。
- `npm run build`：生产模式构建。

### 运行形态

- 生产页面通过 `index.html` 加载 `dist/bundle.js`。
- `manifest-disabled.json` 和 `service-worker.js` 表明曾预留 PWA/离线能力，但当前 manifest 链接被注释，service worker 文件顶部也标注未使用。

## 3. 已实现功能

### 文件能力

- 新建画布。
- 打开本地图片、目录、URL、Data URL、摄像头、测试模板。
- 拖拽导入和剪贴板粘贴。
- 导出/保存 PNG、JPG、BMP、WEBP、GIF、TIFF、JSON 图层数据、Data URL。
- 快速保存/快速加载。
- 打印。

### 编辑能力

- 撤销、重做。
- 删除选择区。
- 复制选择区。
- 复制到剪贴板。
- 粘贴。
- 全选。

### 视图能力

- 放大、缩小、原始尺寸、适配窗口。
- 网格。
- 参考线新增、更新、清空。
- 标尺。
- 全屏。

### 图片处理

- 图片信息和 EXIF。
- 画布尺寸调整。
- 裁剪空白/Trim。
- 缩放、旋转、翻转、平移。
- 不透明度调整。
- 亮度、对比度、色相、饱和度、自动颜色校正。
- 降低色深、调色板、直方图。

### 图层系统

- 新建图层、从选择区新建图层。
- 复制、显示/隐藏、删除、清空、重命名。
- 图层上下移动。
- 合成参数设置。
- 差异对比、向下合并、扁平化。
- 矢量层转栅格。

### 绘图和工具

- 选择对象、选择区域。
- 画笔、铅笔、橡皮、魔术橡皮、填充。
- 取色器。
- 形状工具和多种矢量形状。
- 文本工具，支持字体、字号、粗体、斜体、下划线、删除线、描边、字距、行距。
- 渐变。
- 克隆图章。
- 裁剪。
- 局部模糊、锐化、去饱和。
- Bulge/Pinch 变形。
- 动画预览/图层帧。
- 媒体搜索、精灵图、关键点、内容填充、颜色缩放、替换颜色、恢复 Alpha。

### 滤镜和效果

- 通用 CSS 滤镜：模糊、亮度、对比度、灰度、色相旋转、反色、饱和、棕褐色、阴影。
- Instagram 风格滤镜：1977、Aden、Clarendon、Gingham、Inkwell、Lo-fi、Toaster、Valencia、X-Pro II。
- 其他效果：黑白、边框、蓝图、盒状模糊、降噪、抖动、网点、边缘、浮雕、增强、颗粒、热力图、马赛克、夜视、油画、铅笔、锐化、曝光/日晒、移轴、暗角、鲜艳度、复古、缩放模糊。

### 帮助和国际化

- 键盘快捷键说明。
- 关于弹窗。
- 多语言翻译文件。
- 语言切换。
- PHP 翻译辅助脚本。

## 4. 架构和核心流程

### 启动流程

1. `index.html` 加载 `dist/bundle.js`。
2. Webpack bundle 的源码入口是 `src/js/main.js`。
3. `main.js` 引入全局 CSS、配置、基础类、文件模块和 action 索引。
4. 浏览器 `load` 后实例化：
   - `Base_layers_class`
   - `Base_tools_class`
   - `Base_gui_class`
   - `Base_state_class`
   - `Base_search_class`
   - `File_open_class`
   - `File_save_class`
5. 实例注册到 `app` 单例对象，同时部分实例暴露到 `window`，便于外部页面和示例调用。
6. 调用 `GUI.init()` 渲染 UI、加载模块、绑定菜单事件。
7. 调用 `Layers.init()` 初始化图层和画布。

### 菜单到功能调用

- 菜单结构定义在 `src/js/config-menu.js`。
- 每个菜单项通过 `target` 指向模块方法，例如 `file/open.open_file`。
- `Base_gui_class.load_modules()` 使用 webpack `require.context("./../modules/", true, /\.js$/)` 自动加载 `src/js/modules` 下所有模块。
- 菜单点击后拆分 `target`，找到对应模块实例并调用方法。

### 工具系统

- 工具配置定义在 `src/js/config.js` 的 `config.TOOLS`。
- `Base_tools_class` 提供鼠标/触摸事件、坐标转换、吸附、通用形状绘制、参数读取等基础能力。
- 具体工具位于 `src/js/tools` 和 `src/js/tools/shapes`，通常继承 `Base_tools_class`。

### 图层和状态

- `Base_layers_class` 负责图层数据、画布渲染、图层合成和坐标换算。
- `Base_state_class` 维护撤销/重做历史。
- `src/js/actions` 中的 action 封装可撤销操作，例如插入图层、更新图层、删除图层、切换可见性、设置选择区。
- `Bundle_action` 可把多个 action 合并为一次历史记录。
- `src/js/actions/store/image-store.js` 使用 IndexedDB 类能力保存较大的图像数据，减轻内存历史压力。

## 5. 文件作用说明

### 根目录文件

| 文件 | 作用 |
| --- | --- |
| `.babelrc` | Babel 配置，使用 `@babel/preset-env` 和 runtime 插件处理现代 JS 兼容。 |
| `.gitignore` | Git 忽略规则，排除系统文件、IDE 文件、日志、`node_modules` 等。 |
| `index.html` | 应用入口 HTML，定义菜单、工具栏、左右侧栏、主画布和弹窗挂载点，并加载 `dist/bundle.js`。 |
| `manifest-disabled.json` | 被禁用的 PWA manifest 配置，声明应用名称、图标、横屏和独立显示模式。 |
| `MIT-LICENSE.txt` | MIT 开源许可证。 |
| `package.json` | npm 包信息、脚本、依赖和开发依赖。 |
| `package-lock.json` | npm 依赖锁定文件。 |
| `README.md` | 项目介绍、功能列表、在线地址、嵌入方式、构建说明入口。 |
| `SECURITY.md` | 安全支持版本和漏洞报告方式。 |
| `service-worker.js` | 未启用的 service worker 示例，用于缓存静态资源和离线访问。 |
| `webpack.config.js` | Webpack 入口、输出、loader、ProvidePlugin、DefinePlugin 和 devServer 配置。 |

### 构建产物

| 文件 | 作用 |
| --- | --- |
| `dist/bundle.js` | Webpack 打包后的应用脚本，`index.html` 直接加载。 |
| `dist/bundle.js.map` | bundle 的 source map，便于调试源码映射。 |
| `dist/bundle.js.LICENSE.txt` | 打包依赖的许可证摘要。 |

### 示例页面

| 文件 | 作用 |
| --- | --- |
| `examples/add-edit-imgData.html` | 演示通过外部页面向 miniPaint 添加和编辑 ImageData。 |
| `examples/open-edit-save.html` | 演示打开图片、编辑后保存/取回数据，与 `images/test-collection.json` 联动。 |
| `examples/zoom.html` | 演示外部页面控制或使用缩放相关能力。 |

### 图片和资源

| 文件 | 作用 |
| --- | --- |
| `images/favicon.png` | PNG favicon。 |
| `images/favicon.svg` | SVG favicon。 |
| `images/logo-colors.png` | 彩色 logo/示例图片。 |
| `images/logo.svg` | SVG logo。 |
| `images/preview.gif` | README 使用的动态预览图。 |
| `images/preview.jpg` | 社交分享和预览使用的静态图。 |
| `images/test-collection.json` | 测试模板/演示图层数据，可由“Open Test Template”加载。 |
| `images/manifest/*.png` | PWA manifest 图标尺寸资源。 |
| `images/icons/animation.svg` | 动画工具图标。 |
| `images/icons/arrow-down.svg` | 下拉箭头图标。 |
| `images/icons/blur.svg` | 模糊工具图标。 |
| `images/icons/bold.svg` | 文本粗体图标。 |
| `images/icons/brush.svg` | 画笔工具图标。 |
| `images/icons/bulge_pinch.svg` | Bulge/Pinch 工具图标。 |
| `images/icons/clone.svg` | 克隆工具图标。 |
| `images/icons/crop.svg` | 裁剪工具图标。 |
| `images/icons/delete.svg` | 删除图标。 |
| `images/icons/desaturate.svg` | 去饱和工具图标。 |
| `images/icons/erase.svg` | 橡皮工具图标。 |
| `images/icons/external.png` | 外部链接图标。 |
| `images/icons/fill.svg` | 填充工具图标。 |
| `images/icons/gradient.png` | 渐变工具图标。 |
| `images/icons/grid.png` | 网格图标。 |
| `images/icons/italic.svg` | 文本斜体图标。 |
| `images/icons/magic_erase.svg` | 魔术橡皮图标。 |
| `images/icons/media.svg` | 媒体搜索图标。 |
| `images/icons/menu.svg` | 菜单图标。 |
| `images/icons/pencil.svg` | 铅笔工具图标。 |
| `images/icons/pick_color.svg` | 取色器图标。 |
| `images/icons/refresh.svg` | 刷新图标。 |
| `images/icons/select.svg` | 对象选择工具图标。 |
| `images/icons/selection.svg` | 选择区工具图标。 |
| `images/icons/shape.svg` | 形状工具图标。 |
| `images/icons/sharpen.svg` | 锐化工具图标。 |
| `images/icons/strikethrough.svg` | 文本删除线图标。 |
| `images/icons/text.svg` | 文本工具图标。 |
| `images/icons/underline.svg` | 文本下划线图标。 |
| `images/icons/undo.svg` | 撤销图标。 |
| `images/icons/view.svg` | 视图图标。 |

### CSS

| 文件 | 作用 |
| --- | --- |
| `src/css/reset.css` | 浏览器样式重置、主题基础变量/类。 |
| `src/css/utility.css` | 通用辅助样式。 |
| `src/css/component.css` | 表单、按钮、面板、控件等组件样式。 |
| `src/css/layout.css` | 主布局、侧边栏、画布区域、响应式布局。 |
| `src/css/menu.css` | 顶部菜单和子菜单样式。 |
| `src/css/popup.css` | 弹窗样式。 |
| `src/css/print.css` | 打印样式。 |

### JS 入口和配置

| 文件 | 作用 |
| --- | --- |
| `src/js/main.js` | 应用启动入口，导入样式和核心类，初始化单例并渲染 GUI/图层。 |
| `src/js/app.js` | 全局单例容器，保存 GUI、Tools、Layers、Config、State、FileOpen、FileSave、Actions。 |
| `src/js/config.js` | 主配置文件，包含画布状态、颜色、缩放、语言、字体、主题、工具列表和默认工具参数。 |
| `src/js/config-menu.js` | 菜单定义，描述 File/Edit/View/Image/Layer/Effects/Tools/Help 的菜单层级和目标方法。 |

### Actions

| 文件 | 作用 |
| --- | --- |
| `src/js/actions/_README.md` | 撤销/重做 action 系统说明入口，指向项目 wiki。 |
| `src/js/actions/base.js` | action 基类，定义可撤销操作的公共结构。 |
| `src/js/actions/index.js` | action 统一导出入口。 |
| `src/js/actions/bundle.js` | 将多个 action 组合成一次历史记录，支持整体 do/undo/free。 |
| `src/js/actions/activate-tool.js` | 切换当前激活工具。 |
| `src/js/actions/add-layer-filter.js` | 给图层添加滤镜配置。 |
| `src/js/actions/autoresize-canvas.js` | 根据图层或操作自动调整画布。 |
| `src/js/actions/clear-layer.js` | 清空指定图层内容。 |
| `src/js/actions/delete-layer.js` | 删除指定图层。 |
| `src/js/actions/delete-layer-filter.js` | 删除图层上的指定滤镜。 |
| `src/js/actions/delete-layer-settings.js` | 删除图层上的指定设置项。 |
| `src/js/actions/init-canvas-zoom.js` | 初始化或重置画布缩放相关状态。 |
| `src/js/actions/insert-layer.js` | 插入新图层。 |
| `src/js/actions/prepare-canvas.js` | 重新准备画布尺寸和背景。 |
| `src/js/actions/refresh-action-attributes.js` | 刷新工具/操作属性 UI。 |
| `src/js/actions/refresh-layers-gui.js` | 刷新图层面板 UI。 |
| `src/js/actions/reorder-layer.js` | 调整图层顺序。 |
| `src/js/actions/reset-layers.js` | 重置图层集合。 |
| `src/js/actions/reset-selection.js` | 清空当前选择区。 |
| `src/js/actions/select-layer.js` | 选中指定图层。 |
| `src/js/actions/select-next-layer.js` | 选中下一图层。 |
| `src/js/actions/select-previous-layer.js` | 选中上一图层。 |
| `src/js/actions/set-object-property.js` | 设置对象/矢量层属性。 |
| `src/js/actions/set-selection.js` | 设置选择区位置和尺寸。 |
| `src/js/actions/stop-animation.js` | 停止动画播放状态。 |
| `src/js/actions/toggle-layer-visibility.js` | 切换图层可见性。 |
| `src/js/actions/update-config.js` | 更新全局配置项。 |
| `src/js/actions/update-layer.js` | 更新图层元数据和参数。 |
| `src/js/actions/update-layer-image.js` | 更新图层图像数据。 |
| `src/js/actions/store/image-store.js` | IndexedDB 图像数据仓库，用于历史记录中保存/读取/删除大图像数据。 |

### Core

| 文件 | 作用 |
| --- | --- |
| `src/js/core/base-gui.js` | GUI 总控，加载模块、渲染主界面、绑定菜单/窗口/移动端事件、主题和翻译初始化。 |
| `src/js/core/base-layers.js` | 图层核心，管理图层数组、当前图层、渲染合成、坐标转换、图层命中和图像输出。 |
| `src/js/core/base-search.js` | 搜索基础能力，用于工具/菜单/图片等搜索场景。 |
| `src/js/core/base-selection.js` | 选择区管理，处理选择框、选择数据、裁切/复制等选择相关逻辑。 |
| `src/js/core/base-state.js` | 撤销/重做状态管理，执行 action，维护历史栈和内存/数据库预算。 |
| `src/js/core/base-tools.js` | 工具基类，处理鼠标/触摸坐标、拖拽、吸附、通用形状创建和工具参数。 |

### Core Components

| 文件 | 作用 |
| --- | --- |
| `src/js/core/components/index.js` | 注册/导出核心 UI 组件。 |
| `src/js/core/components/color-input.js` | 颜色输入控件，处理 HEX/RGBA 输入和校验。 |
| `src/js/core/components/color-picker-gradient.js` | 渐变/色彩选择控件。 |
| `src/js/core/components/number-input.js` | 数字输入组件。 |
| `src/js/core/components/range.js` | 滑块范围输入组件。 |
| `src/js/core/components/swatches.js` | 色板组件。 |

### Core GUI

| 文件 | 作用 |
| --- | --- |
| `src/js/core/gui/gui-colors.js` | 右侧颜色面板，管理前景色、透明度、色板和颜色输入。 |
| `src/js/core/gui/gui-details.js` | 图层详情面板，渲染和更新图层属性、滤镜、对象参数。 |
| `src/js/core/gui/gui-information.js` | 信息面板，显示鼠标位置、尺寸、颜色等上下文信息。 |
| `src/js/core/gui/gui-layers.js` | 图层列表面板，显示图层、选中、拖拽排序、可见性等。 |
| `src/js/core/gui/gui-menu.js` | 顶部菜单渲染与菜单事件分发。 |
| `src/js/core/gui/gui-preview.js` | 缩略预览面板。 |
| `src/js/core/gui/gui-tools.js` | 左侧工具栏渲染和工具切换。 |

### Libraries

| 文件 | 作用 |
| --- | --- |
| `src/js/libs/canvastotiff.js` | Canvas 转 TIFF 导出工具。 |
| `src/js/libs/clipboard.js` | 剪贴板读写封装。 |
| `src/js/libs/color-matrix.js` | 颜色矩阵处理工具。 |
| `src/js/libs/color-thief.js` | 主色/调色板提取库。 |
| `src/js/libs/glfx.js` | WebGL 图像滤镜库。 |
| `src/js/libs/helpers.js` | 通用工具方法，包含 DOM、颜色、数学、cookie、图像辅助等。 |
| `src/js/libs/imagefilters.js` | Canvas 像素级图像滤镜集合。 |
| `src/js/libs/jquery.translate.js` | jQuery 翻译插件。 |
| `src/js/libs/popup.js` | 弹窗/对话框组件封装。 |
| `src/js/libs/vintage.js` | 复古风格滤镜实现。 |
| `src/js/libs/zoomView.js` | 图片缩放视图辅助。 |
| `src/js/libs/gifjs/gif.js` | GIF 生成库。 |
| `src/js/libs/gifjs/gif.worker.js` | GIF 编码 Web Worker。 |

### Tools

| 文件 | 作用 |
| --- | --- |
| `src/js/tools/animation.js` | 动画工具，按图层/帧预览动画并控制延迟。 |
| `src/js/tools/blur.js` | 局部模糊笔刷工具。 |
| `src/js/tools/brush.js` | 画笔工具。 |
| `src/js/tools/bulge_pinch.js` | Bulge/Pinch 局部变形工具。 |
| `src/js/tools/clone.js` | 克隆图章工具。 |
| `src/js/tools/crop.js` | 裁剪工具。 |
| `src/js/tools/desaturate.js` | 局部去饱和工具。 |
| `src/js/tools/erase.js` | 橡皮擦工具。 |
| `src/js/tools/fill.js` | 油漆桶填充工具。 |
| `src/js/tools/gradient.js` | 渐变填充工具。 |
| `src/js/tools/magic_erase.js` | 魔术橡皮/相似颜色透明化工具。 |
| `src/js/tools/media.js` | 媒体/在线图片搜索插入工具。 |
| `src/js/tools/pencil.js` | 铅笔工具。 |
| `src/js/tools/pick_color.js` | 取色器工具。 |
| `src/js/tools/select.js` | 对象/图层选择和变换工具。 |
| `src/js/tools/selection.js` | 矩形选择区工具。 |
| `src/js/tools/shape.js` | 形状工具总入口，选择具体形状子工具。 |
| `src/js/tools/sharpen.js` | 局部锐化工具。 |
| `src/js/tools/text.js` | 文本工具，包含字体加载、文本布局、选择、编辑和文本层渲染。 |

### Shape Tools

| 文件 | 作用 |
| --- | --- |
| `src/js/tools/shapes/arrow.js` | 箭头形状。 |
| `src/js/tools/shapes/bezier_curve.js` | 贝塞尔曲线形状。 |
| `src/js/tools/shapes/callout.js` | 标注气泡形状。 |
| `src/js/tools/shapes/cog.js` | 齿轮形状。 |
| `src/js/tools/shapes/cylinder.js` | 圆柱形状。 |
| `src/js/tools/shapes/ellipse.js` | 椭圆/圆形。 |
| `src/js/tools/shapes/heart.js` | 心形。 |
| `src/js/tools/shapes/hexagon.js` | 六边形。 |
| `src/js/tools/shapes/human.js` | 人形图标形状。 |
| `src/js/tools/shapes/line.js` | 直线形状。 |
| `src/js/tools/shapes/moon.js` | 月牙形状。 |
| `src/js/tools/shapes/parallelogram.js` | 平行四边形。 |
| `src/js/tools/shapes/pentagon.js` | 五边形。 |
| `src/js/tools/shapes/plus.js` | 加号形状。 |
| `src/js/tools/shapes/polygon.js` | 多边形。 |
| `src/js/tools/shapes/rectangle.js` | 矩形/圆角矩形。 |
| `src/js/tools/shapes/right_triangle.js` | 直角三角形。 |
| `src/js/tools/shapes/romb.js` | 菱形。 |
| `src/js/tools/shapes/star.js` | 星形。 |
| `src/js/tools/shapes/tear.js` | 水滴形。 |
| `src/js/tools/shapes/trapezoid.js` | 梯形。 |
| `src/js/tools/shapes/triangle.js` | 三角形。 |

### Modules - File

| 文件 | 作用 |
| --- | --- |
| `src/js/modules/file/new.js` | 新建画布和初始化图层。 |
| `src/js/modules/file/open.js` | 打开文件、目录、URL、Data URL、摄像头和测试模板。 |
| `src/js/modules/file/print.js` | 打印当前图像。 |
| `src/js/modules/file/quickload.js` | 从本地快速加载保存数据。 |
| `src/js/modules/file/quicksave.js` | 快速保存当前工作状态。 |
| `src/js/modules/file/save.js` | 导出/保存图片、动画、TIFF、JSON 图层数据、Data URL。 |

### Modules - Edit

| 文件 | 作用 |
| --- | --- |
| `src/js/modules/edit/copy.js` | 复制图像/选择区到剪贴板。 |
| `src/js/modules/edit/paste.js` | 粘贴剪贴板内容。 |
| `src/js/modules/edit/redo.js` | 执行重做。 |
| `src/js/modules/edit/selection.js` | 编辑菜单中的选择区操作。 |
| `src/js/modules/edit/undo.js` | 执行撤销。 |

### Modules - View

| 文件 | 作用 |
| --- | --- |
| `src/js/modules/view/full_screen.js` | 全屏切换。 |
| `src/js/modules/view/grid.js` | 网格显示和配置。 |
| `src/js/modules/view/guides.js` | 参考线新增、更新、删除。 |
| `src/js/modules/view/ruler.js` | 标尺绘制与开关。 |
| `src/js/modules/view/zoom.js` | 缩放控制。 |

### Modules - Image

| 文件 | 作用 |
| --- | --- |
| `src/js/modules/image/auto_adjust.js` | 自动颜色调整。 |
| `src/js/modules/image/color_corrections.js` | 亮度、对比度、色相、饱和等颜色校正。 |
| `src/js/modules/image/decrease_colors.js` | 降低颜色数量/色深。 |
| `src/js/modules/image/flip.js` | 水平/垂直翻转。 |
| `src/js/modules/image/histogram.js` | 生成和显示直方图。 |
| `src/js/modules/image/information.js` | 图像尺寸、EXIF、文件等信息弹窗。 |
| `src/js/modules/image/opacity.js` | 调整图片/图层不透明度。 |
| `src/js/modules/image/palette.js` | 提取和显示颜色调色板。 |
| `src/js/modules/image/resize.js` | 图像缩放，支持不同重采样方式。 |
| `src/js/modules/image/rotate.js` | 图像旋转。 |
| `src/js/modules/image/size.js` | 调整画布尺寸。 |
| `src/js/modules/image/translate.js` | 图像平移。 |
| `src/js/modules/image/trim.js` | 裁剪透明/空白边缘。 |

### Modules - Layer

| 文件 | 作用 |
| --- | --- |
| `src/js/modules/layer/clear.js` | 清空当前图层。 |
| `src/js/modules/layer/composition.js` | 设置图层混合/合成参数。 |
| `src/js/modules/layer/delete.js` | 删除当前图层。 |
| `src/js/modules/layer/differences.js` | 与下方图层进行差异计算。 |
| `src/js/modules/layer/duplicate.js` | 复制图层。 |
| `src/js/modules/layer/flatten.js` | 扁平化所有图层。 |
| `src/js/modules/layer/merge.js` | 向下合并图层。 |
| `src/js/modules/layer/move.js` | 图层上移/下移。 |
| `src/js/modules/layer/new.js` | 新建普通图层或从选择区新建图层。 |
| `src/js/modules/layer/raster.js` | 矢量层转栅格层。 |
| `src/js/modules/layer/rename.js` | 重命名图层。 |
| `src/js/modules/layer/visibility.js` | 切换图层可见性。 |

### Modules - Effects

| 文件 | 作用 |
| --- | --- |
| `src/js/modules/effects/abstract/css.js` | CSS 滤镜类效果的公共基类。 |
| `src/js/modules/effects/browser.js` | 效果浏览器，集中预览/选择滤镜。 |
| `src/js/modules/effects/black_and_white.js` | 黑白效果。 |
| `src/js/modules/effects/blueprint.js` | 蓝图效果。 |
| `src/js/modules/effects/borders.js` | 边框效果。 |
| `src/js/modules/effects/box_blur.js` | 盒状模糊。 |
| `src/js/modules/effects/denoise.js` | 降噪效果。 |
| `src/js/modules/effects/dither.js` | 抖动效果。 |
| `src/js/modules/effects/dot_screen.js` | 网点效果。 |
| `src/js/modules/effects/edge.js` | 边缘检测效果。 |
| `src/js/modules/effects/emboss.js` | 浮雕效果。 |
| `src/js/modules/effects/enrich.js` | 增强效果。 |
| `src/js/modules/effects/grains.js` | 颗粒效果。 |
| `src/js/modules/effects/heatmap.js` | 热力图效果。 |
| `src/js/modules/effects/mosaic.js` | 马赛克效果。 |
| `src/js/modules/effects/night_vision.js` | 夜视效果。 |
| `src/js/modules/effects/oil.js` | 油画效果。 |
| `src/js/modules/effects/pencil.js` | 铅笔画效果。 |
| `src/js/modules/effects/sharpen.js` | 全图锐化效果。 |
| `src/js/modules/effects/solarize.js` | Solarize/日晒效果。 |
| `src/js/modules/effects/tilt_shift.js` | 移轴效果。 |
| `src/js/modules/effects/vibrance.js` | 鲜艳度效果。 |
| `src/js/modules/effects/vignette.js` | 暗角效果。 |
| `src/js/modules/effects/vintage.js` | 复古效果。 |
| `src/js/modules/effects/zoom_blur.js` | 缩放模糊效果。 |
| `src/js/modules/effects/common/blur.js` | CSS Gaussian Blur 效果。 |
| `src/js/modules/effects/common/brightness.js` | CSS 亮度效果。 |
| `src/js/modules/effects/common/contrast.js` | CSS 对比度效果。 |
| `src/js/modules/effects/common/grayscale.js` | CSS 灰度效果。 |
| `src/js/modules/effects/common/hue-rotate.js` | CSS 色相旋转效果。 |
| `src/js/modules/effects/common/invert.js` | CSS 反色效果。 |
| `src/js/modules/effects/common/saturate.js` | CSS 饱和度效果。 |
| `src/js/modules/effects/common/sepia.js` | CSS 棕褐色效果。 |
| `src/js/modules/effects/common/shadow.js` | CSS 阴影效果。 |
| `src/js/modules/effects/instagram/1977.js` | Instagram 1977 滤镜。 |
| `src/js/modules/effects/instagram/aden.js` | Instagram Aden 滤镜。 |
| `src/js/modules/effects/instagram/clarendon.js` | Instagram Clarendon 滤镜。 |
| `src/js/modules/effects/instagram/gingham.js` | Instagram Gingham 滤镜。 |
| `src/js/modules/effects/instagram/inkwell.js` | Instagram Inkwell 滤镜。 |
| `src/js/modules/effects/instagram/lofi.js` | Instagram Lo-fi 滤镜。 |
| `src/js/modules/effects/instagram/toaster.js` | Instagram Toaster 滤镜。 |
| `src/js/modules/effects/instagram/valencia.js` | Instagram Valencia 滤镜。 |
| `src/js/modules/effects/instagram/xpro2.js` | Instagram X-Pro II 滤镜。 |

### Modules - Tools

| 文件 | 作用 |
| --- | --- |
| `src/js/modules/tools/color_to_alpha.js` | 将指定颜色转换为透明 Alpha。 |
| `src/js/modules/tools/color_zoom.js` | 颜色缩放/局部颜色放大查看工具。 |
| `src/js/modules/tools/content_fill.js` | 内容填充工具。 |
| `src/js/modules/tools/keypoints.js` | 关键点检测/标注工具。 |
| `src/js/modules/tools/replace_color.js` | 替换指定颜色。 |
| `src/js/modules/tools/restore_alpha.js` | 恢复透明度/Alpha。 |
| `src/js/modules/tools/search.js` | 工具/功能搜索入口。 |
| `src/js/modules/tools/settings.js` | 应用设置读取和设置弹窗。 |
| `src/js/modules/tools/sprites.js` | 精灵图生成/切分工具。 |
| `src/js/modules/tools/translate.js` | 加载语言包并翻译界面。 |

### Modules - Help

| 文件 | 作用 |
| --- | --- |
| `src/js/modules/help/about.js` | 关于弹窗。 |
| `src/js/modules/help/shortcuts.js` | 快捷键说明弹窗。 |

### Languages

| 文件 | 作用 |
| --- | --- |
| `src/js/languages/ar.json` | 阿拉伯语翻译。 |
| `src/js/languages/de.json` | 德语翻译。 |
| `src/js/languages/el.json` | 希腊语翻译。 |
| `src/js/languages/empty.json` | 空翻译模板。 |
| `src/js/languages/es.json` | 西班牙语翻译。 |
| `src/js/languages/fr.json` | 法语翻译。 |
| `src/js/languages/it.json` | 意大利语翻译。 |
| `src/js/languages/ja.json` | 日语翻译。 |
| `src/js/languages/ko.json` | 韩语翻译。 |
| `src/js/languages/lt.json` | 立陶宛语翻译。 |
| `src/js/languages/nl.json` | 荷兰语翻译。 |
| `src/js/languages/pt.json` | 葡萄牙语翻译。 |
| `src/js/languages/ru.json` | 俄语翻译。 |
| `src/js/languages/tr.json` | 土耳其语翻译。 |
| `src/js/languages/uk.json` | 英式英语/乌克兰相关命名的翻译文件，项目菜单中作为 English (UK) 使用。 |
| `src/js/languages/zh.json` | 简体中文翻译。 |
| `src/js/languages/credits.js` | 翻译贡献者/语言 credits 信息。 |

### Translator Tool

| 文件 | 作用 |
| --- | --- |
| `tools/translator/index.php` | 翻译辅助工具入口页面/执行脚本。 |
| `tools/translator/config.php` | 翻译工具配置。 |
| `tools/translator/libs/GoogleTranslate.php` | Google Translate 调用封装。 |
| `tools/translator/libs/translator.php` | 翻译工具主逻辑。 |

## 6. 测试用例情况

### 当前仓库中的测试相关内容

- `package.json` 没有 `test` 脚本。
- 未发现 Jest、Mocha、Vitest、Karma、Playwright、Cypress 等测试框架配置。
- 未发现 `test`、`tests`、`__tests__`、`*.spec.js`、`*.test.js` 等自动化测试文件。
- `images/test-collection.json` 是手动测试/演示模板数据，可通过菜单 `File -> Open -> Open Test Template` 加载。
- `examples/open-edit-save.html` 会读取 `images/test-collection.json`，用于外部集成演示，不是自动化断言测试。
- `src/js/tools/text.js` 中的 `kerningTestCanvas` 是字体测量辅助逻辑，不是测试用例。

### 结论

当前项目没有正式自动化测试用例。测试方式主要依赖：

- 运行开发服务器后进行浏览器手动验证。
- 使用示例页面验证外部集成。
- 通过测试模板 JSON 检查图层、文本、形状、图片导入导出等典型场景。

### 建议补充的测试方向

- 单元测试：覆盖 `helpers.js`、颜色转换、尺寸计算、action do/undo、图层排序等纯逻辑。
- 集成测试：使用 Playwright 打开 `index.html`，验证新建、导入、绘制、撤销、导出等主流程。
- 视觉回归：对核心滤镜、形状、文字渲染做 canvas 快照对比。
- 文件导入导出测试：覆盖 PNG/JPG/WEBP/GIF/TIFF/JSON 图层数据。
- 跨浏览器测试：README 声明支持 Chrome、Firefox、Opera、Edge、Safari、Yandex，建议用 Playwright/WebDriver 做核心路径回归。

## 7. 维护注意事项

- `dist` 是构建产物，修改源码后需要执行 `npm run build` 更新 bundle。
- `service-worker.js` 当前未启用，开启前需要同步缓存列表和版本策略。
- `config-menu.js` 中部分非英文语言名称显示为乱码，可能与历史编码或复制来源有关，若要改善国际化体验应检查源文件编码和翻译文件。
- `Base_gui_class.load_modules()` 自动加载 `src/js/modules` 下所有 JS 文件，新增菜单功能时应同时保证模块路径和 `config-menu.js` 的 `target` 一致。
- `config.TOOLS` 是工具注册的核心来源，新增工具时需要同步工具类、图标、默认参数、GUI 属性渲染逻辑。
- 图像历史可能占用大量内存，涉及大图操作时应关注 `Base_state_class` 和 `actions/store/image-store.js` 的内存/IndexedDB 管理策略。
