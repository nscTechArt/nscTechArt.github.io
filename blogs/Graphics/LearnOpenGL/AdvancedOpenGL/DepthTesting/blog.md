---
layout: page
permalink: /blogs/Graphics/LearnOpenGL/AdvancedOpenGL/DepthTesting/index.html
title: Depth Testing
---

### Depth Testing

---

在之前关于坐标系的那篇博客中，我们渲染了一个立方体，并且使用了**depth buffer**来避免本应该被遮挡的三角形出现在其他三角形前面的错误。在这篇博客中，我们会进一步讨论depth buffer和它所存储的depth value，以及depth buffer是如何判断一个片段是否在前面的。

就像color buffer用来存储片段的颜色那样，depth buffer也用来存储每个片段的信息，且与color buffer 的宽高一直。depth buffer由OpenGL的窗口系统自动创建，并且以16/24/32位的浮点数存储深度值。在大多数系统中，depth buffer采用的精度是24位。

当深度测试开启时，OpenGL会将当前片段的深度值与depth buffer中存储的深度值作比较，这就是深度测试的含义。如果测试通过，则当前片段会被渲染，depth buffer中的值会被当前片段的深度值替代，如果深度测试未通过，则这个片段就会被丢弃。
