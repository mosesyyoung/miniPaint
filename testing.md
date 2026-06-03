# miniPaint 自动化测试用例设计

## 1. 测试目标

为 miniPaint 建立覆盖核心风险面的自动化测试体系，重点验证：

- 图层、画布、工具、菜单、撤销/重做等核心编辑行为稳定。
- PNG/JPG/WEBP/BMP/TIFF/GIF/JSON/Data URL 等导入导出链路可用。
- 主要滤镜、形状、文本、选择区和图层合成结果符合预期。
- UI 在桌面和移动端关键尺寸下不破版。
- 多浏览器关键路径一致。
- 大图、多图层、历史记录等高内存场景不会明显退化或崩溃。

当前仓库没有测试框架和 `test` 脚本，因此本文同时包含推荐测试栈与测试用例设计。

## 2. 推荐测试栈

### 单元测试

- 推荐：Vitest + jsdom。
- 适用范围：纯逻辑函数、配置结构、action do/undo、图层数据变更、颜色/尺寸计算、导出 JSON 结构。
- 原因：项目是前端 ES Module + Webpack，Vitest 对 ESM 友好，启动快，适合补充大量逻辑测试。

### 集成和端到端测试

- 推荐：Playwright。
- 适用范围：浏览器真实运行、菜单点击、画布绘制、导入导出、快捷键、拖拽、剪贴板、响应式布局。
- 浏览器矩阵：
  - Chromium：必须。
  - Firefox：必须。
  - WebKit：必须，覆盖 Safari 类问题。

### 视觉回归

- 推荐：Playwright screenshot + pixelmatch 或 Playwright 原生截图断言。
- 适用范围：主界面、画布渲染、图层合成、形状、文本、滤镜预览。
- 建议阈值：
  - UI 截图：`maxDiffPixelRatio <= 0.01`。
  - Canvas 渲染：优先做像素采样或固定截图，滤镜类允许 `0.02` 到 `0.05` 的差异，具体按浏览器稳定性调整。

### 文件导入导出测试

- 推荐：Playwright + fixtures + Node 文件校验工具。
- 适用范围：真实浏览器中的文件上传、下载拦截、Data URL、JSON 往返、图片尺寸和 mime 校验。
- 辅助库建议：
  - `pngjs`：校验 PNG 尺寸和像素。
  - `jpeg-js`：校验 JPG 基础解码。
  - `gifuct-js` 或同类库：校验 GIF 帧。
  - `sharp`：如果允许引入原生依赖，可统一解码 PNG/JPG/WEBP/TIFF。

## 3. 测试目录建议

建议新增：

```text
tests/
  unit/
    actions/
    core/
    libs/
    modules/
  e2e/
    app-start.spec.js
    editing.spec.js
    import-export.spec.js
    layers.spec.js
    tools.spec.js
    visual.spec.js
  fixtures/
    sample-1x1.png
    sample-transparent.png
    sample-photo.jpg
    sample-layers.json
    sample-animated.gif
  snapshots/
  helpers/
    app-driver.js
    canvas-assertions.js
    file-assertions.js
```

建议新增 npm scripts：

```json
{
  "test": "npm run test:unit && npm run test:e2e",
  "test:unit": "vitest run",
  "test:unit:watch": "vitest",
  "test:e2e": "playwright test",
  "test:e2e:ui": "playwright test --ui",
  "test:visual": "playwright test tests/e2e/visual.spec.js",
  "test:build": "npm run build"
}
```

## 4. 测试优先级

| 优先级 | 范围 | 目标 |
| --- | --- | --- |
| P0 | 启动、图层、撤销/重做、打开/保存 JSON、PNG 导出、基础绘制 | 防止核心工作流不可用。 |
| P1 | 图片缩放旋转、常用滤镜、文本、选择区、剪贴板、快捷键、响应式 UI | 覆盖高频编辑能力。 |
| P2 | TIFF/GIF/WEBP/BMP、摄像头、外部 URL、PWA 预留、多语言、性能压力 | 覆盖低频或环境依赖能力。 |

## 5. 单元测试用例

### 5.1 配置和菜单

| ID | 优先级 | 模块 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- | --- |
| UT-CONFIG-001 | P0 | `src/js/config.js` | 默认配置完整 | 导入 config，检查基础字段 | `WIDTH/HEIGHT` 初始可为空，`COLOR` 为合法 HEX，`ZOOM=1`，`TOOLS` 非空。 |
| UT-CONFIG-002 | P0 | `src/js/config.js` | 默认工具合法 | 遍历 `config.TOOLS` | 每个工具有唯一 `name`，attributes 为对象或可用配置。 |
| UT-CONFIG-003 | P1 | `src/js/config.js` | 文本工具参数完整 | 查找 `text` 工具 | 存在字体、字号、粗体、斜体、下划线、填充色、描边色等属性。 |
| UT-CONFIG-004 | P1 | `src/js/config.js` | 形状工具默认参数合法 | 查找 rectangle、ellipse、star 等工具 | 尺寸、颜色、布尔参数类型符合预期。 |
| UT-MENU-001 | P0 | `src/js/config-menu.js` | 菜单 target 格式合法 | 遍历菜单树 | 每个 target 均匹配 `path.method` 格式。 |
| UT-MENU-002 | P0 | `src/js/config-menu.js` | 菜单基础分类存在 | 导入菜单定义 | 包含 File、Edit、View、Image、Layer、Effects、Tools、Help。 |
| UT-MENU-003 | P1 | `src/js/config-menu.js` | 快捷键不重复或冲突可控 | 收集 shortcut | 同一级菜单内快捷键无意外重复；全局冲突列入白名单。 |
| UT-MENU-004 | P1 | `src/js/config-menu.js` | 菜单指向模块存在 | 扫描 `src/js/modules` 文件 | 每个 target 的模块路径对应实际文件，方法名可被静态或运行时验证。 |

### 5.2 Helpers 和基础库

| ID | 优先级 | 模块 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- | --- |
| UT-HELPER-001 | P0 | `helpers.js` | HEX/RGB 转换 | 输入常见颜色值 | 输出 RGB/HEX 与预期一致。 |
| UT-HELPER-002 | P0 | `helpers.js` | 透明度/Alpha 转换 | 输入 0、128、255 | 百分比或 RGBA 计算正确。 |
| UT-HELPER-003 | P1 | `helpers.js` | 数值边界限制 | 输入小于最小、大于最大、正常值 | 输出被限制到合法区间。 |
| UT-HELPER-004 | P1 | `helpers.js` | URL 参数解析 | 构造查询字符串 | 返回对象键值正确，并过滤非法字符。 |
| UT-HELPER-005 | P1 | `helpers.js` | Cookie 读写 | jsdom 下写入再读取 | 值一致，过期/不存在返回约定值。 |
| UT-COLOR-001 | P1 | `color-matrix.js` | 颜色矩阵初始化 | 实例化矩阵 | 默认矩阵合法，链式变换不抛错。 |
| UT-COLOR-002 | P1 | `color-thief.js` | 调色板提取 | 使用 fixture canvas/image | 返回主色数组长度和 RGB 范围正确。 |
| UT-TIFF-001 | P1 | `canvastotiff.js` | Canvas 转 TIFF ArrayBuffer | 构造 2x2 canvas | 返回 ArrayBuffer，包含 TIFF 文件头。 |
| UT-TIFF-002 | P2 | `canvastotiff.js` | 空画布处理 | 传入 0 宽或无效 canvas | 明确报错或返回失败，不静默生成损坏文件。 |

### 5.3 Action 撤销/重做

| ID | 优先级 | 模块 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- | --- |
| UT-ACTION-001 | P0 | `base.js` | action 基类 | 实例化派生 action | `id/name/memory_estimate/database_estimate` 默认值正确。 |
| UT-ACTION-002 | P0 | `insert-layer.js` | 插入图层 | 初始化空 config，执行 do | 图层数量增加，当前图层指向新图层。 |
| UT-ACTION-003 | P0 | `insert-layer.js` | 插入图层撤销 | 执行 do 后 undo | 图层恢复原状态。 |
| UT-ACTION-004 | P0 | `delete-layer.js` | 删除图层 | 两个图层下删除当前图层 | 数量减少，当前图层切换到有效图层。 |
| UT-ACTION-005 | P0 | `delete-layer.js` | 删除撤销 | 删除后 undo | 被删图层恢复，顺序和选中状态正确。 |
| UT-ACTION-006 | P0 | `update-layer.js` | 更新图层属性 | 修改 x/y/width/height/name | 新值写入，undo 后恢复旧值。 |
| UT-ACTION-007 | P0 | `update-layer-image.js` | 更新图层图片 | 传入测试 canvas | 图层 image/link 更新，undo 后恢复。 |
| UT-ACTION-008 | P0 | `bundle.js` | 组合 action 成功 | 组合插入和更新 | do 顺序执行，undo 逆序执行。 |
| UT-ACTION-009 | P0 | `bundle.js` | 组合 action 中途失败 | 第二个 action 抛错 | 已执行 action 被回滚，错误向外抛出。 |
| UT-ACTION-010 | P1 | `reorder-layer.js` | 图层排序 | 三层中移动第二层 | 顺序正确，undo 恢复。 |
| UT-ACTION-011 | P1 | `toggle-layer-visibility.js` | 可见性切换 | 执行 do/undo | visible 布尔值切换和恢复。 |
| UT-ACTION-012 | P1 | `set-selection.js` | 设置选择区 | 输入 x/y/w/h | selection 状态正确，undo 恢复。 |
| UT-ACTION-013 | P1 | `add/delete-layer-filter.js` | 图层滤镜增删 | 添加滤镜后删除 | 滤镜数组状态正确，undo/redo 正确。 |
| UT-ACTION-014 | P1 | `clear-layer.js` | 清空图层 | 清空有内容图层 | layer 元数据和图像内容清空，undo 恢复。 |
| UT-ACTION-015 | P2 | `autoresize-canvas.js` | 自动扩画布 | 插入大于画布的图层 | 画布尺寸按策略扩展，undo 恢复。 |

### 5.4 State 历史管理

| ID | 优先级 | 模块 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- | --- |
| UT-STATE-001 | P0 | `base-state.js` | 执行 action | 调用 `do_action` | action 入历史栈，index 前进。 |
| UT-STATE-002 | P0 | `base-state.js` | 撤销 | 执行两个 action 后 undo | index 后退，最后一个 action undo 被调用。 |
| UT-STATE-003 | P0 | `base-state.js` | 重做 | undo 后 redo | action do 再次调用，状态恢复。 |
| UT-STATE-004 | P0 | `base-state.js` | 新 action 清空 redo | undo 后执行新 action | redo 历史被清空。 |
| UT-STATE-005 | P1 | `base-state.js` | 合并历史 | 使用 `merge_with_history` | 多次操作合并为一个历史项。 |
| UT-STATE-006 | P1 | `base-state.js` | 空撤销/重做 | 无历史时调用 undo/redo | 不抛异常，提示逻辑可被 spy。 |
| UT-STATE-007 | P2 | `base-state.js` | 历史内存清理 | 构造超预算 action | 旧历史释放，`free()` 被调用。 |

### 5.5 图层和选择区

| ID | 优先级 | 模块 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- | --- |
| UT-LAYER-001 | P0 | `base-layers.js` | 初始化默认图层 | 调用 init 或构造等价状态 | 至少一个可编辑图层，尺寸等于画布。 |
| UT-LAYER-002 | P0 | `base-layers.js` | 图层合成 | 两个不同颜色图层合成到 canvas | 像素结果符合叠放和透明度规则。 |
| UT-LAYER-003 | P0 | `base-layers.js` | 隐藏图层不渲染 | 设置上层 visible=false | 合成结果只包含可见图层。 |
| UT-LAYER-004 | P1 | `base-layers.js` | 坐标换算 | 设置 `ZOOM=2` | screen/world 坐标转换正确。 |
| UT-LAYER-005 | P1 | `base-layers.js` | 图层命中 | 多图层重叠点击 | 返回最上方可见可命中图层。 |
| UT-LAYER-006 | P1 | `base-layers.js` | 单图层导出 canvas | 调用 `convert_layer_to_canvas` | canvas 尺寸和像素正确。 |
| UT-SELECTION-001 | P0 | `base-selection.js` | 设置选择框 | 输入矩形 | selection 坐标、宽高正确。 |
| UT-SELECTION-002 | P1 | `base-selection.js` | 选择区越界裁剪 | 输入超出画布范围 | 选择区被限制或渲染不越界。 |
| UT-SELECTION-003 | P1 | `base-selection.js` | 旋转对象控制点 | 设置 rotate | 控制点坐标计算稳定。 |

### 5.6 工具基础逻辑

| ID | 优先级 | 模块 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- | --- |
| UT-TOOL-001 | P0 | `base-tools.js` | 工具参数读取 | 设置当前工具 attributes | `getParams()` 返回展开后的值。 |
| UT-TOOL-002 | P0 | `base-tools.js` | 鼠标坐标转换 | 模拟 pageX/pageY、canvas offset、zoom | 返回画布世界坐标正确。 |
| UT-TOOL-003 | P1 | `base-tools.js` | 拖拽状态 | 模拟 mousedown/move/up | `is_drag`、click、last 坐标正确。 |
| UT-TOOL-004 | P1 | `base-tools.js` | 吸附到画布中心 | 鼠标接近中心 | 返回中心吸附坐标。 |
| UT-TOOL-005 | P1 | `base-tools.js` | Shift 禁用吸附 | 按住 Shift | 返回 null，辅助线清空。 |
| UT-TOOL-006 | P1 | `base-tools.js` | 通用形状绘制 | 调用 `draw_shape` | canvas 对应区域出现非透明像素。 |
| UT-BRUSH-001 | P1 | `brush.js` | 画笔绘制 | 模拟拖拽 | 图层像素被写入。 |
| UT-PENCIL-001 | P1 | `pencil.js` | 铅笔硬边 | 绘制直线 | 边缘无半透明抗锯齿或符合设定。 |
| UT-FILL-001 | P1 | `fill.js` | 连续填充 | 简单封闭区域填充 | 仅封闭区域变色。 |
| UT-MAGIC-001 | P1 | `magic_erase.js` | 魔术橡皮 | 相近颜色区域 | 符合 power/contiguous 参数。 |
| UT-TEXT-001 | P1 | `text.js` | 文本文档插入 | 插入普通字符串 | 行、字符位置和文本内容正确。 |
| UT-TEXT-002 | P1 | `text.js` | 文本删除 | 删除单字符和跨行范围 | 文档结构正确。 |
| UT-TEXT-003 | P1 | `text.js` | 文本样式区间 | 设置粗体/颜色 | 指定 range metadata 正确。 |
| UT-SHAPE-001 | P1 | `tools/shapes/*.js` | 每种形状可渲染 | 遍历形状类 render | 不抛错，canvas 有非透明像素。 |

### 5.7 文件模块

| ID | 优先级 | 模块 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- | --- |
| UT-FILE-001 | P0 | `save.js` | JSON 导出结构 | 构造两层图层后 `export_as_json()` | 包含 `info/user_fonts/layers/data`，图层私有字段被排除。 |
| UT-FILE-002 | P0 | `save.js` | Data URL 导出 | 调用 `save_data_url` 的核心 canvas 逻辑 | 返回 `data:image/` 开头内容。 |
| UT-FILE-003 | P1 | `save.js` | 格式支持检测 | mock canvas.toDataURL | 支持格式返回 true，不支持返回 false。 |
| UT-FILE-004 | P1 | `save.js` | GIF 导出帧过滤 | 构造多图层动画 | 只把可见/有效帧加入 GIF。 |
| UT-FILE-005 | P1 | `open.js` | JSON 解析 | 输入有效 JSON | 恢复画布尺寸、图层、字体和图像数据。 |
| UT-FILE-006 | P1 | `open.js` | JSON 兼容旧 render_function | 输入旧结构 JSON | 映射到当前 render function。 |
| UT-FILE-007 | P1 | `quickload/quicksave.js` | 快存快载 | mock localStorage | 保存后可读取并调用 open JSON。 |
| UT-FILE-008 | P2 | `open.js` | 无效 JSON | 输入损坏 JSON | 明确报错，不污染当前图层。 |

## 6. 集成测试用例

### 6.1 应用启动和基础 UI

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| IT-APP-001 | P0 | 首页可启动 | 启动 dev server，访问 `/index.html` | 无控制台 error，主菜单、画布、左右侧栏出现。 |
| IT-APP-002 | P0 | 全局实例可用 | 页面 load 后执行 `window.Layers/window.State/window.FileOpen/window.FileSave` | 全部存在且含关键方法。 |
| IT-APP-003 | P0 | 默认画布创建 | 读取 `AppConfig.WIDTH/HEIGHT/layers` | 画布尺寸有效，至少一个图层。 |
| IT-APP-004 | P1 | 菜单可展开 | 点击 File/Edit/View 等菜单 | 子菜单显示且点击外部可关闭。 |
| IT-APP-005 | P1 | 右侧面板折叠恢复 | 点击 Preview/Colors/Information toggle | 面板隐藏/显示，刷新后 cookie 状态可恢复。 |
| IT-APP-006 | P1 | 移动端菜单 | 视口设为 390x844，点击移动菜单按钮 | 左右侧栏可打开关闭，无内容重叠。 |
| IT-APP-007 | P2 | 主题切换 | 打开 Settings 修改 theme | body class 切换为对应主题，刷新后保持。 |

### 6.2 新建、绘制、撤销/重做

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| IT-EDIT-001 | P0 | 新建画布 | File -> New，输入 320x240 | canvas 和 config 尺寸变为 320x240，图层重置。 |
| IT-EDIT-002 | P0 | 画笔绘制 | 选择 Brush，在画布拖拽 | canvas 指定区域像素变化，图层非空。 |
| IT-EDIT-003 | P0 | 撤销画笔 | 绘制后点击 Undo 或 Ctrl+Z | 像素恢复到绘制前。 |
| IT-EDIT-004 | P0 | 重做画笔 | 撤销后 Ctrl+Y | 像素恢复到绘制后。 |
| IT-EDIT-005 | P0 | 铅笔绘制 | 选择 Pencil，绘制短线 | 线条存在，颜色等于当前色。 |
| IT-EDIT-006 | P1 | 橡皮擦 | 先绘制，再选择 Erase 擦除 | 被擦区域 alpha 降低或透明。 |
| IT-EDIT-007 | P1 | 填充 | 绘制封闭矩形后 Fill | 封闭区域被填色，外部不变。 |
| IT-EDIT-008 | P1 | 取色器 | 在已知颜色像素点击 Pick Color | 当前颜色变为该像素颜色。 |
| IT-EDIT-009 | P1 | 快捷键切工具 | 按工具快捷键或点击工具栏 | 当前工具高亮和 `AppConfig.TOOL.name` 同步。 |
| IT-EDIT-010 | P1 | 连续撤销多步 | 执行绘制、填充、新图层、移动 | 多次 undo 逐步恢复，redo 逐步重放。 |

### 6.3 图层流程

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| IT-LAYER-001 | P0 | 新建图层 | Layer -> New | 图层数量 +1，新图层被选中。 |
| IT-LAYER-002 | P0 | 删除图层 | 新建两层后 Layer -> Delete | 当前图层删除，至少保留一个图层。 |
| IT-LAYER-003 | P0 | 隐藏图层 | 在上层绘制后 Layer -> Show/Hide | 上层内容从画布消失，再切换恢复。 |
| IT-LAYER-004 | P1 | 复制图层 | 绘制后 Layer -> Duplicate | 新图层像素与原图层一致。 |
| IT-LAYER-005 | P1 | 图层排序 | 三层不同颜色，Layer Move Up/Down | 合成结果随层级变化。 |
| IT-LAYER-006 | P1 | 重命名图层 | Layer -> Rename 输入名称 | 图层面板展示新名称，JSON 导出包含新名称。 |
| IT-LAYER-007 | P1 | 向下合并 | 两层不同颜色，Merge Down | 图层数减少，合成视觉保持一致。 |
| IT-LAYER-008 | P1 | 扁平化 | 多层后 Flatten Image | 仅剩单图层，合成像素保持一致。 |
| IT-LAYER-009 | P1 | 合成模式 | 设置图层 composition/opacity | 合成像素符合透明度预期。 |
| IT-LAYER-010 | P2 | 矢量层转栅格 | 插入文本或形状后 Raster | 图层不再是矢量，视觉保持一致。 |

### 6.4 图片菜单功能

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| IT-IMAGE-001 | P0 | Resize 当前图层 | 打开 fixture，Image -> Resize 到 50% | 图层尺寸减半，画布按参数变化。 |
| IT-IMAGE-002 | P0 | Rotate 90 度 | 打开非正方形图片，Image -> Rotate 90 | 宽高交换或对象旋转状态正确，视觉旋转。 |
| IT-IMAGE-003 | P1 | Flip Horizontal | 打开左右不同颜色图片，水平翻转 | 左右像素交换。 |
| IT-IMAGE-004 | P1 | Flip Vertical | 打开上下不同颜色图片，垂直翻转 | 上下像素交换。 |
| IT-IMAGE-005 | P1 | Trim | 打开带透明边图片，Image -> Trim | 画布或图层边界裁到非透明区域。 |
| IT-IMAGE-006 | P1 | Canvas Size | 改画布为更大尺寸 | 原图保留在预期位置，新区域透明或背景色正确。 |
| IT-IMAGE-007 | P1 | Color Corrections | 调亮/降对比 | 像素平均亮度/对比度按方向变化。 |
| IT-IMAGE-008 | P1 | Auto Adjust | 打开低对比图片后执行 | 直方图范围扩展或像素变化。 |
| IT-IMAGE-009 | P2 | Histogram | 打开图片后 Image -> Histogram | 弹窗出现直方图 canvas，无 JS error。 |
| IT-IMAGE-010 | P2 | Palette | 打开多色图片后 Image -> Color Palette | 弹窗显示主要颜色块。 |

### 6.5 选择区和剪贴板

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| IT-SEL-001 | P0 | 矩形选择 | 选择 Selection 工具拖出区域 | 选择框显示，config selection 有坐标。 |
| IT-SEL-002 | P0 | 删除选择区 | 选择已绘制区域，按 Delete | 区域透明，外部不变。 |
| IT-SEL-003 | P1 | Select All | Ctrl+A | 选择区覆盖整个画布。 |
| IT-SEL-004 | P1 | Copy Selection | 选择区域后 Layer -> New from Selection | 新图层内容等于选择区域。 |
| IT-SEL-005 | P1 | Copy to Clipboard | 选择区域后 Ctrl+C | 剪贴板收到 image/png 或浏览器允许时无错误。 |
| IT-SEL-006 | P1 | Paste | 设置剪贴板图片后 Ctrl+V | 新图层插入粘贴图片。 |
| IT-SEL-007 | P2 | 选择区越界拖拽 | 从画布外拖入或拖出 | 应用不崩溃，选择区裁剪到有效范围。 |

### 6.6 形状和文本

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| IT-SHAPE-001 | P0 | 矩形绘制 | 选择 Shapes -> Rectangle，拖拽 | 新矢量图层出现，边框/填充可见。 |
| IT-SHAPE-002 | P1 | 圆形约束 | Ellipse 工具按 Ctrl/Meta 拖拽 | 宽高按圆形约束。 |
| IT-SHAPE-003 | P1 | 直线绘制 | Line 工具拖拽 | 线段出现，端点在拖拽位置。 |
| IT-SHAPE-004 | P1 | 星形参数 | Star 调整角数/内径后绘制 | 形状变化符合参数。 |
| IT-SHAPE-005 | P1 | 贝塞尔曲线 | Bezier Curve 添加控制点 | 曲线渲染且可完成编辑。 |
| IT-TEXT-001 | P0 | 新建文本 | 选择 Text，点击画布输入文字 | 文本图层创建，文字可见。 |
| IT-TEXT-002 | P1 | 文本样式 | 设置 bold/italic/underline/color | 图层预览体现样式变化。 |
| IT-TEXT-003 | P1 | 文本编辑 | 重新选中文本层，修改内容 | 内容更新，undo 恢复旧文本。 |
| IT-TEXT-004 | P1 | 字体加载 | 选择 Web Font | 字体加载完成后文本宽度或形态变化。 |
| IT-TEXT-005 | P2 | 多行文本 | 输入换行、多段样式 | 行距、选择范围、导出 JSON 正确。 |

### 6.7 滤镜和效果

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| IT-EFFECT-001 | P0 | Gaussian Blur | 打开棋盘图片，执行 Blur | 边缘像素被平滑。 |
| IT-EFFECT-002 | P0 | Brightness | 执行 Brightness +20 | 平均亮度上升。 |
| IT-EFFECT-003 | P0 | Contrast | 执行 Contrast +20 | 像素对比度上升或改变。 |
| IT-EFFECT-004 | P1 | Grayscale | 执行 Grayscale | 采样像素 R/G/B 接近相等。 |
| IT-EFFECT-005 | P1 | Negative | 执行 Negative | 像素约等于 255 - 原值。 |
| IT-EFFECT-006 | P1 | Sharpen | 对模糊图片执行 | 边缘差异增大。 |
| IT-EFFECT-007 | P1 | Mosaic | 执行马赛克 | 块内像素趋同。 |
| IT-EFFECT-008 | P1 | Vignette | 执行暗角 | 角落像素变暗，中心相对稳定。 |
| IT-EFFECT-009 | P1 | Instagram filters | 遍历 9 个滤镜 | 均不抛错，像素发生变化。 |
| IT-EFFECT-010 | P2 | Effect browser | 打开效果浏览器并选择效果 | 预览出现，应用后图像变化。 |

## 7. 视觉回归测试用例

视觉回归建议固定：

- 视口：`1440x900`、`1024x768`、`390x844`。
- 主题：dark、light 至少各一组主界面截图。
- 字体：尽量禁用外部字体波动，或等待字体加载完成。
- 动画：测试截图前暂停动画工具和 GIF 播放。

| ID | 优先级 | 截图对象 | 前置状态 | 断言 |
| --- | --- | --- | --- | --- |
| VR-UI-001 | P0 | 初始主界面 | 首次加载默认画布 | 与基线截图差异在阈值内。 |
| VR-UI-002 | P1 | light 主题 | 切换 light theme | 菜单、侧栏、画布区域无错位。 |
| VR-UI-003 | P1 | 移动端布局 | 390x844 打开左右侧栏 | 不重叠，按钮可见。 |
| VR-UI-004 | P1 | 弹窗样式 | 打开 New/Resize/Save 弹窗 | 表单完整，按钮不溢出。 |
| VR-CANVAS-001 | P0 | 测试模板渲染 | Open Test Template | 画布截图与基线一致。 |
| VR-CANVAS-002 | P0 | 基础图层合成 | 红底 + 半透明蓝层 | 合成颜色与基线一致。 |
| VR-CANVAS-003 | P1 | 文本层 | 固定字体和文本 | 字符位置、样式稳定。 |
| VR-CANVAS-004 | P1 | 常用形状集合 | 矩形、圆、星、箭头、曲线 | 形状轮廓与基线一致。 |
| VR-CANVAS-005 | P1 | 选择框 | 画布上创建选择区 | 虚线框和控制点位置正确。 |
| VR-CANVAS-006 | P1 | Grid + Ruler + Guides | 开启网格、标尺、参考线 | 辅助线位置正确。 |
| VR-EFFECT-001 | P1 | Grayscale 效果 | 固定 fixture | 截图与基线接近。 |
| VR-EFFECT-002 | P1 | Blur 效果 | 固定 fixture | 截图与基线接近。 |
| VR-EFFECT-003 | P1 | Vignette 效果 | 固定 fixture | 暗角范围稳定。 |
| VR-EFFECT-004 | P2 | Instagram 滤镜集合 | 固定九宫格 fixture | 每个滤镜预览稳定。 |

## 8. 文件导入导出测试用例

### 8.1 导入测试

| ID | 优先级 | 格式 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- | --- |
| IO-IMPORT-001 | P0 | PNG | 普通 PNG | File -> Open File 上传 `sample-1x1.png` | 新图层或画布包含图片，尺寸正确。 |
| IO-IMPORT-002 | P0 | PNG | 透明 PNG | 上传 `sample-transparent.png` | Alpha 保留，透明像素仍透明。 |
| IO-IMPORT-003 | P0 | JPG | 普通照片 | 上传 `sample-photo.jpg` | 图片打开，EXIF 可读取时信息正确。 |
| IO-IMPORT-004 | P1 | GIF | 动图 | 上传 `sample-animated.gif` | 可解析为帧/图层或按当前实现打开首帧，不卡死。 |
| IO-IMPORT-005 | P1 | JSON | miniPaint 图层 JSON | 上传 `sample-layers.json` | 恢复画布尺寸、图层数量、名称、像素数据。 |
| IO-IMPORT-006 | P1 | Data URL | PNG Data URL | File -> Open Data URL 输入内容 | 图像打开且像素正确。 |
| IO-IMPORT-007 | P1 | Directory | 图片目录 | 选择多个 fixture 文件 | 多文件处理逻辑不报错，符合当前导入策略。 |
| IO-IMPORT-008 | P2 | URL | 同源图片 URL | Open URL 输入测试服务图片 | 图片加载成功。 |
| IO-IMPORT-009 | P2 | URL | 跨域图片 URL | 输入无 CORS 图片 | 给出错误提示或避免 tainted canvas 导致崩溃。 |
| IO-IMPORT-010 | P2 | Invalid | 损坏图片 | 上传随机字节文件 | 明确失败提示，当前画布不被破坏。 |

### 8.2 导出测试

| ID | 优先级 | 格式 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- | --- |
| IO-EXPORT-001 | P0 | PNG | 导出完整图像 | 绘制固定图形，Export PNG | 下载文件 mime 为 PNG，尺寸和像素正确。 |
| IO-EXPORT-002 | P0 | JSON | 保存图层数据 | 多层图像 Save JSON | JSON 可解析，包含图层和 data，重新导入视觉一致。 |
| IO-EXPORT-003 | P1 | JPG | 导出 JPG | 有透明图层导出 JPG | 文件可解码，透明区域按背景策略处理。 |
| IO-EXPORT-004 | P1 | WEBP | 导出 WEBP | Export WEBP | 支持浏览器下载 WEBP，不支持时提示。 |
| IO-EXPORT-005 | P1 | BMP | 导出 BMP | Export BMP | 文件可解码，尺寸正确。 |
| IO-EXPORT-006 | P1 | TIFF | 导出 TIFF | Export TIFF | 文件头和尺寸正确。 |
| IO-EXPORT-007 | P1 | GIF | 多图层导出 GIF | 创建多帧动画，Export GIF | GIF 帧数、尺寸、延迟符合设置。 |
| IO-EXPORT-008 | P1 | Data URL | Save As Data URL | 执行保存 Data URL | 弹窗/输出为 data URL，可重新导入。 |
| IO-EXPORT-009 | P1 | Layers | 仅保存当前图层 | Save layers 选择 current | 下载图像尺寸和内容等于当前图层。 |
| IO-EXPORT-010 | P2 | Large PNG | 3000x2000 画布导出 | 绘制后导出 PNG | 不崩溃，文件尺寸正确，耗时在预算内。 |

### 8.3 往返测试

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| IO-ROUND-001 | P0 | JSON 往返 | 创建多层、文本、形状，导出 JSON，再打开 JSON | 图层数、名称、位置、可见性、画布尺寸一致，视觉一致。 |
| IO-ROUND-002 | P0 | PNG 往返 | 绘制固定像素图，导出 PNG，再打开 PNG | 合成后的像素一致或在编码允许差异内。 |
| IO-ROUND-003 | P1 | Data URL 往返 | 导出 Data URL 后打开 | 像素和尺寸一致。 |
| IO-ROUND-004 | P1 | GIF 往返 | 导出 GIF 后重新打开 | 能打开且帧/首帧符合实现约定。 |
| IO-ROUND-005 | P2 | JSON 旧版本兼容 | 使用旧字段 fixture | 能正常打开，render_function 被迁移。 |

## 9. 跨浏览器和响应式测试

| ID | 优先级 | 场景 | 浏览器/视口 | 步骤 | 期望 |
| --- | --- | --- | --- | --- | --- |
| CB-001 | P0 | 核心启动 | Chromium/Firefox/WebKit | 访问首页 | 无启动 error。 |
| CB-002 | P0 | PNG 打开和导出 | Chromium/Firefox/WebKit | 打开 PNG，导出 PNG | 均成功。 |
| CB-003 | P0 | 绘制和撤销 | Chromium/Firefox/WebKit | Brush 绘制，Ctrl+Z/Ctrl+Y | 行为一致。 |
| CB-004 | P1 | Clipboard | Chromium/Firefox/WebKit | 粘贴图片 | 支持则成功，不支持则降级提示。 |
| CB-005 | P1 | Fullscreen | Chromium/Firefox/WebKit | View -> Full Screen | 支持则进入全屏，不支持则不崩溃。 |
| CB-006 | P1 | WEBP 支持 | Chromium/Firefox/WebKit | Export WEBP | 支持判断与浏览器能力一致。 |
| CB-007 | P1 | 移动端竖屏 | 390x844 | 打开菜单、绘制 | UI 可操作，不遮挡画布关键区域。 |
| CB-008 | P1 | 平板横屏 | 1024x768 | 执行新建、绘制、图层 | 面板和画布布局稳定。 |
| CB-009 | P2 | 高 DPI | deviceScaleFactor=2 | 绘制和截图 | 鼠标坐标和渲染位置正确。 |

## 10. 性能和稳定性测试

| ID | 优先级 | 场景 | 步骤 | 指标 |
| --- | --- | --- | --- | --- |
| PERF-001 | P1 | 启动性能 | 冷启动首页 | 首屏可交互小于 3 秒，控制台无 error。 |
| PERF-002 | P1 | 大图打开 | 打开 3000x2000 PNG | 10 秒内完成，页面不崩溃。 |
| PERF-003 | P1 | 多图层渲染 | 创建 50 个 512x512 图层 | 渲染可完成，交互无明显卡死。 |
| PERF-004 | P1 | 连续撤销 | 执行 100 次小笔画后连续 undo | 历史栈稳定，内存释放策略生效。 |
| PERF-005 | P2 | 大图滤镜 | 2000x2000 图片执行 blur/sharpen | 操作完成且无浏览器崩溃。 |
| PERF-006 | P2 | GIF 导出 | 20 帧 512x512 GIF | 能完成导出，耗时记录入报告。 |
| PERF-007 | P2 | JSON 大文件 | 20 层 JSON 导入导出 | 往返成功，文件大小和耗时可接受。 |

## 11. 安全和异常测试

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| SEC-001 | P1 | XSS 文件名 | 上传名称含 `<script>` 的文件 | UI 转义显示，不执行脚本。 |
| SEC-002 | P1 | XSS 图层名 | 重命名图层为 HTML 字符串 | 图层面板不执行 HTML。 |
| SEC-003 | P1 | XSS JSON 文本层 | JSON 文本内容含 HTML/JS | 文本按内容渲染，不插入可执行 DOM。 |
| SEC-004 | P1 | 超大 Data URL | 输入超长 Data URL | 合理失败或提示，不冻结页面。 |
| SEC-005 | P2 | 损坏 EXIF | 打开 EXIF 异常 JPG | 信息读取失败不影响图片打开。 |
| SEC-006 | P2 | CORS 污染 canvas | 打开跨域图后导出 | 给出可理解错误，不导致未捕获异常。 |

## 12. 可访问性和键盘测试

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| A11Y-001 | P1 | 菜单键盘访问 | Tab 到主菜单，Enter/方向键操作 | 焦点可见，菜单可打开。 |
| A11Y-002 | P1 | 弹窗焦点 | 打开 New/Save 弹窗 | 焦点进入弹窗，Esc/Cancel 可关闭。 |
| A11Y-003 | P1 | 按钮可读名称 | 扫描按钮 aria/text | 图标按钮具备可读名称或 sr-only 文本。 |
| A11Y-004 | P2 | 颜色对比 | dark/light 主题跑 axe | 关键文本对比度符合基本要求。 |
| A11Y-005 | P2 | 快捷键说明 | Help -> Keyboard Shortcuts | 快捷键列表可打开且内容非空。 |

## 13. 多语言测试

| ID | 优先级 | 场景 | 步骤 | 期望 |
| --- | --- | --- | --- | --- |
| I18N-001 | P1 | 中文语言包 | Tools -> Language -> zh | 菜单和主要标题翻译为中文。 |
| I18N-002 | P1 | URL 参数语言 | 访问 `?lang=zh` | 初始化后自动加载中文。 |
| I18N-003 | P1 | 语言 cookie | 切换语言后刷新 | 语言保持。 |
| I18N-004 | P2 | 所有语言包 JSON | 遍历 `src/js/languages/*.json` | JSON 可解析，键值为字符串。 |
| I18N-005 | P2 | 缺失翻译降级 | 使用 `empty.json` 或缺失键 | 不显示 undefined，不崩溃。 |

## 14. 测试数据设计

建议准备以下 fixture：

| 文件 | 内容 | 用途 |
| --- | --- | --- |
| `sample-1x1.png` | 1x1 红色 PNG | 最小导入导出、像素断言。 |
| `sample-transparent.png` | 含透明区域的 PNG | Alpha 保留、Trim、透明导出。 |
| `sample-checker.png` | 黑白棋盘格 | Blur、Sharpen、Resize 断言。 |
| `sample-quadrants.png` | 四象限红绿蓝白 | Flip、Rotate、取色、裁剪断言。 |
| `sample-photo.jpg` | 小尺寸照片，最好含 EXIF | JPG 导入、EXIF、滤镜。 |
| `sample-animated.gif` | 3 帧不同颜色 GIF | GIF 导入/导出/动画。 |
| `sample-layers.json` | miniPaint 多图层工程 | JSON 导入、视觉回归、兼容性。 |
| `sample-old-layers.json` | 旧版本字段格式 | JSON 迁移兼容。 |
| `sample-invalid.json` | 损坏 JSON | 异常处理。 |
| `sample-large.png` | 3000x2000 图片 | 性能和大图稳定性。 |

## 15. 自动化实现顺序建议

1. P0 单元测试：config、menu target、actions、base-state、JSON export。
2. P0 Playwright 冒烟：启动、新建、绘制、撤销/重做、PNG 导出、JSON 往返。
3. P1 图层和图片处理：新建/删除/隐藏/合并/resize/rotate/flip。
4. P1 视觉回归：默认 UI、测试模板、基础图层合成、文本、形状。
5. P1 文件矩阵：PNG/JPG/WEBP/BMP/TIFF/GIF/Data URL。
6. P2 性能、异常、安全、多语言、跨浏览器扩展。

## 16. CI 建议

推荐流水线：

```text
install
  npm ci

static
  npm run build

unit
  npm run test:unit

e2e-chromium
  npm run test:e2e -- --project=chromium

e2e-cross-browser
  npm run test:e2e -- --project=firefox --project=webkit

visual
  npm run test:visual
```

CI 策略：

- 每个 PR 必跑：build、P0 unit、P0 Chromium e2e。
- 主分支 nightly：全量浏览器、视觉回归、性能 smoke。
- 视觉基线只允许人工审核更新。
- 导出文件测试应保存失败产物，方便定位。
- Playwright trace、screenshot、video 在失败时上传为 artifact。

## 17. 验收标准

第一阶段可认为测试体系达标的条件：

- P0 用例全部自动化，且 Chromium 下稳定通过。
- 至少覆盖 PNG 和 JSON 的导入导出往返。
- 至少有 5 个关键视觉基线：初始 UI、测试模板、图层合成、文本、形状集合。
- CI 中 `npm run build`、`test:unit`、`test:e2e` 可一键运行。
- 失败报告能定位到具体测试、截图、trace 和下载文件。

第二阶段达标：

- P1 用例自动化率达到 80% 以上。
- Chromium/Firefox/WebKit 核心链路通过。
- 文件格式矩阵覆盖 PNG/JPG/WEBP/BMP/TIFF/GIF/JSON/Data URL。
- 大图和多图层性能用例有稳定阈值和历史趋势。
