---
title: 绘制渲染引擎中的无限栅格
date: 2024-10-04 22:18 +0800
categories: [Engine, Evnia Engine Developing]
media_subpath: /assets/img/Engine/evnia/
math: false
---

在渲染引擎中，显示一个与世界坐标空间对齐的栅格能够提供很好的参考效果，我们将会在本博客中了解如何绘制一个无限范围的栅格。

相应的代码基于OpenGL与GLSL，后面可能会更新在Vulkan中的实现方法，但思路都是相同的

---

在绘制栅格之前，我们需要先声明一些与栅格相关的参数，我们可以直接定义在GLSL中

1. 首先，我们需要定义栅格在世界坐标空间中的范围，也就是栅格在离相机多远的地方可见

   ```glsl
   float gridSize = 100.0;
   ```

2. 然后是栅格的单位大小

   ```glsl
   float gridCellSize = 0.025;
   ```

3. 接下来是栅格中的直线的颜色。这里我们会使用两种颜色，分别用于细线与粗线，其中粗线每隔十条细线绘制一次

   ```glsl
   vec4 colorThinLine = vec4(0.5, 0.5, 0.5, 1.0);
   vec4 colorBoldLine = vec4(0.5, 0.5, 0.5, 1.0);
   ```

4. 栅格将会根据LOD改变渲染直线的数量，当两条相邻的直线之间的距离小于某个定值时，就应该切换LOD

   ```glsl
   const float gridMinPixelsBetweenCells = 2.0;
   ```

5. 顶点着色器所需要的顶点数据和索引很简单

   ```glsl
   const vec3 pos[4] = vec3[4]
   (
   	vec3(-1.0, 0.0, -1.0),
   	vec3( 1.0, 0.0, -1.0),
   	vec3( 1.0, 0.0,  1.0),
   	vec3(-1.0, 0.0,  1.0)
   );
   
   const int indices[6] = int[6](0, 1, 2, 2, 3, 0);
   ```

6. 我们需要在顶点着色器输出一个值，表示网格在xz平面上的坐标

   ```glsl
   void main()
   {
   	
   }
   ```

   

片段着色器会稍微复杂一些。它会计算出一个能够呈现网格效果的程序化纹理。我们会根据UV坐标在图像空间中的变化速率来绘制直线，从而避免摩尔纹的产生。因此我们需要屏幕空间导数

1. 首先我们实现一些helper函数

   ```glsl
   float log10(float x)
   {
       return log(x) / log(10.0);
   }
   
   float saturate(float x)
   {
       return clamp(x, 0.0, 1.0);
   }
   
   vec2 saturate(vec2 x)
   {
       return clamp(x, vec2(0.0), vec2(1.0));
   }
   
   float max(vec2 v)
   {
       return max(v.x, v.y);
   }
   ```

2. 我们需要计算出UV坐标的导数的屏幕空间长度

   ```
   
   ```

   

---

绘制一个网格系统所需要的步骤：

### Step1: Plane Basic Shaders

首先我们需要绘制一个基本的XY平面
