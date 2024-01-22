---
layout: page
permalink: /blogs/Unity/Metaverse大衍神君-性能优化教程/UGUI优化/index.html
title: UGUI优化
---

### UGUI优化

**UI性能的四类问题**

- Canvas Re-batch时间过长
- Canvas Over-dirty，Re-batch次数过多
- 生成网格顶点时间过长
- Fill-rate overutilization

**Canvas画布**

Canvas负责管理UGUI元素，负责UI渲染网格的生成与更新，并向GPU发送DrawCall指令

对于每个Canvas对象，在绘制之前，都要进行一个合批的过程。

如果Canvas中的UI元素每一帧都保持不变，那么我们只需要在绘制前合批一次，并保留下结果，从而让后续的渲染继续使用这个结果。

如果UI元素发生了变化，Canvas需要重新匹配几何体，就会被标记为Dirty，进行Re-batch

**Canvas Re-batch过程**

1. 根据UI元素深度关系进行排序
2. 检查UI元素的覆盖关系
3. 检查UI元素材质并进行合批

Re-batch是多线程进行的，因此由于移动端CPU核数的差异，Re-batch的效率也会受到影响

**UGUI的渲染细节**

- UGUI的渲染是在Transparent半透明渲染队列中完成的，绘制顺序是从后向前。由于UI元素做Alpha Blend操作，很难保证每一个像素不被重画。UI的overdraw太高，就会导致Fragment Shader利用率过高，造成GPU负担
- UI SpriteAtlas图集利用率不高的情况下，大量完全透明的像素被采样也会导致像素被重绘，造成片元着色器利用率过高；同时纹理采样器浪费了大量采样在无效的像素上，导致需要采样的图集像素不能尽快的被采样，造成纹理采样器的填充率过低，同样也会带来性能问题

**Re-build过程**

- 在WillRenderCanvases事件调用PerformUpdate::CanvasUpdateRegistry接口
  - 通过ICanvasElement.Rebuild方法重新构建Dirty的Layout组件
  - 通过ClippingRegistry.Cullf方法，任何已注册的裁剪组件Clipping Compnents(Such as Masks)的对象进行裁剪剔除操作
  - 任何Dirty的 Graphics Compnents都会被要求重新生成图形元素
- Layout Rebuild
  - UI元素位置、大小、颜色发生变化
  - 优先计算靠近Root节点，并根据层级深度排序
- Graphic Rebuild
  - 顶点数据被标记成Dirty
  - 材质或贴图数据被标记成Dirty

 **使用Canvas的基本准则：**

- 将所有可能打断合批的层移到最下边的图层，尽量避免UI元素出现重叠区域
- 可以拆分使用多个同级或嵌套的Canvas来减少Canvas的Rebatch复杂度
- 拆分动态和静态对象放到不同Canvas下。
- 不使用Layout组件
- Canvas的RenderMode尽量Overlay模式，减少Camera调用的开销

**UGUI射线（Raycaster）优化：**

- 必要的需要交互UI组件才开启“Raycast Target”
- 开启“Raycast Targets”的UI组件越少，层级越浅，性能越好
- 对于复杂的控件，尽量在根节点开启“Raycast Target”
- 对于嵌套的Canvas，OverrideSorting属性会打断射线，可以降低层级遍历的成本