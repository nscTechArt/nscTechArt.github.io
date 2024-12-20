---
title: URP中实现雨窗
date: 2024-12-03 09:48 +0800
categories: [Portfolio, Unity]
media_subpath: /assets/img/Portfolio/Unity/
math: false
---

拆解一下雨窗的效果

在目前现在内置管线中实现，基于Gamma空间

---

### 创建Grid

每个雨滴都生成在一个单独的grid cell中。考虑到雨滴的轨迹是竖直方向上的，所以需要表示grid的矩形形状应该是竖长的。在这里我们使用1: 2的宽高比：

```glsl
const float2 gridAspect = float2(1, 2);
float2 gridUV = i.uv * rcp(gridAspect);
```

我们需要创建很多个grid cell，这一步通过`frac()`实现，该函数可以将划分出多个范围在$[0,1]$之间的子区域。

```glsl
gridUV = frac(gridUV * _GridCount);
```

然后，我们将`gridUV`的范围从$[0,1]$映射到$[-0.5,0.5]$，确保雨滴的初始位置在grid的中心

```glsl
gridUV = gridUV - 0.5;
```

我们就准备好了基础的grid。这里我们可以选择绘制出grid的边框：

```glsl
#ifdef _SHOW_GRID_OUTLINE
if (gridUV.x > 0.48 || gridUV.y > 0.49) color = float4(1, 0, 0, 1);
#endif
```

---

### Raindrop

#### 初始形状

首先我们在grid中绘制出一个圆，作为最基础的雨滴。前面我们已经将每个`gridUV`的范围映射到了$[-0.5,0.5]$，这样的话，grid中任意一点到grid中心的距离就可以构成一个圆形的遮罩，作为雨滴的基础形状：

```glsl
float drop = length(gridUV);
```

结果如下图所示：

![](20241204114353.png)

然后，我们需要缩小雨滴，这里可以使用`smoothstep`函数，能够将grid中非雨滴的部分设置为黑色，雨滴中心为白色，雨滴边缘还能产生较好的过渡效果：

```glsl
float drop = smoothstep(0.05, 0.03, length(gridUV));
```

效果如下所示：

![](20241204114723.png)

但是由于我们此前修改雨滴所在grid的宽高比，所以`gridUV`在x轴与y轴的并非`y = x`的关系，导致通过`gridUV`生成的雨滴也并非圆形。所以，我们在生成雨滴时需要抵消grid拉伸的影响：

```glsl
float drop = smoothstep(0.05, 0.03, length(gridUV * gridAspect));
```

#### 雨滴滑落

首先将`gridUV * gridAspect`命名为一个单独的变量：

```glsl
float2 raindropPos = gridUV * gridAspect;
float raindrop = smoothstep(0.05, 0.03, length(raindropPos));
```

模拟雨滴的滑落，主要思路是修改gridUV的位置，即在x轴与y轴分别引入一个偏移量：

```glsl
float x = 0;
float y = 0;
float2 raindropPos = (gridUV - float2(x, y)) * gridAspect;
float raindrop = smoothstep(0.05, 0.03, length(raindropPos));
```

这里插入一点小的改动，我们可以稍微修改雨滴生成的方式，使其更符合现实世界的形状：

```glsl
y -= gridUV.x * gridUV.x;
```

准备工作已经完成了。我们观察现实世界中的雨滴，它的运动具体下面这些特点：

- 雨滴有可能会因表面张力保持圆润的形状，静止在窗户上，或停留的时间较长
- 随着雨滴质量的增加，或收到其他雨滴撞击，会开始向下滑动，并且初始速度较慢
- 在滑动过程中，存在一定的加速过程

于是我们的思路是这样的：将雨滴的下滑分为两部分：

- 雨滴所在的grid整体会向下滑动
- 雨滴自身在grid内作上下往复运动。当雨滴在grid中向上运动时，与向下运动的grid刚好能够呈现出相对世界静止或缓慢下落的状态

首先是grid的运动:

```glsl
gridUV.y += time * 0.25;
gridUV = frac(gridUV);
```

我们使用`sin`函数来实现雨滴自身的往复运动，但sin函数的值域是$[-1,1]$，我们需要考虑到`gridUV`的值域为$[-0.5, 0.5]$，所以需要对sin函数的结果乘以0.45，确保雨滴不会超出所在的grid

```glsl
float y = -sin(time + sin(time + sin(time) * 0.5)) * 0.45;
```

当雨滴滑落时，受表面摩擦力的不均匀分布影响，呈现曲折或波动的路径。同时如果窗户表面存在污垢或划痕，雨滴会绕过这些障碍，生成更不规则的路径。所以我们需要为雨滴添加水平方向上的偏移:

```glsl
float w = i.uv.y * 10;
float x = sin(3 * w) * pow(sin(w), 6) * 0.45;
```


---

### Rain Trail

雨迹本身与雨滴的生成方式类似，我们先创建出一个位于grid中心，并且比雨滴小一点的“雨滴”作为雨迹：

```glsl
float2 trailPos = (gridUV - float2(x, 0)) * gridAspect;
float trail = smoothstep(0.03, 0.01, length(trailPos));
```

考虑到雨迹本质上是雨滴滑落留下的很多小的droplet形成的，所以我们需要生成一串小液滴。这里的实现方式与创建grid的方式一致，都是通过frac函数划分出很多子区域：

```glsl
float2 trailPos = (gridUV - float2(x, 0)) * gridAspect;
trailPos.y = frac(trailPos.y * 8);
float trail = smoothstep(0.03, 0.01, length(trailPos));
```

这里需要注意，之前我们将gridUV的范围映射到了$[-0.5, 0.5]$，所以这里我们同样需要做相同的映射。另外我们还需要抵消对于`trailPos`在y轴方向上的变化，从而生成圆形的雨滴：

```glsl
trailPos.y = (frac(trailPos.y * 8) - 0.5) / 8;
```

现在雨迹会随着grid一起向下运动，这不是我们想要的结果，我们需要雨迹与窗户保持相对静止的状态：

```glsl
float2 trailPos = (gridUV - float2(x, time * 0.25)) * gridAspect;
```

另外，雨迹只会在雨滴的上方出现，所以我们需要对组成雨迹的小液滴添加特定的遮罩，这个遮罩在雨滴的下方值为0，在雨滴的上方值为1。这种截断的性质听起来很适用`smoothstep`函数：

```glsl
float trailErasingMask = smoothstep(-0.05, 0.05, raindropPos.y);
trail *= trailErasingMask;
```

这里的0.05是之前绘制raindro所用的值，表示雨滴的半径。我们可以将trailErasingMask输出查看一下效果：

![](20241204161604.png)

当前我们只是生成了组成雨迹的小液滴，接下来，我们来模拟出雨迹渐隐的效果，也就是距离雨滴越远的位置小液滴越不明显。特别是，用于渐隐的遮罩会根据雨滴的grid中的位置而调整：当雨滴位于grid中较上的位置时，遮罩较短；而当雨滴要滑出grid时，遮罩较长。`smoothstep`函数除了就有截断的性质，还具有插值的性质：

```glsl
float trailFadingMask = smoothstep(0.5, y, gridUV.y);
trail *= trailFadingMask;
```

---

### Make It Perfect

#### Randomness Based On Grids

现在所有的grid的运动轨迹是相同的，而我们需要每个grid之间存在一定的差异，才能让最终的雨窗看起来符合逻辑。

首先，我们为每个grid创建一个ID：

```glsl
const float2 gridAspect = float2(1, 2);
float2 gridUV = i.uv * rcp(gridAspect) * _GridCount;
gridUV.y += time * 0.25;

// create ID for each grid
// -----------------------
float2 gridID = floor(gridUV);
```

我们用ID作为输出值，输出一个“随机”数：

```glsl
float Noise21(float2 p)
{
    p = frac(p * float2(123.34, 345.45));
    p += dot(p, p + 45.32);
    return frac(p.x * p.y);
}
```

![](20241204165633.png)

随机效果是可以接受的。我们使用这个随机值来影响`time`参数，进而影响雨滴的轨迹。这里需要注意的是，我们的随机数函数的值域为$[0, 1]$，而sin函数的周期是$2\pi$，我们需要确保随机数对`time`参数的影响跨越了该函数的周期：

```glsl
float noise = Noise21(gridID);
time += noise * 6.28318530718;
```

#### Initial Offset On X Axis

目前所以雨滴在grid中的生成位置都是grid在x轴的中心，这样或多或少有一些假，我们希望雨滴的生成位置有一定的偏移：

```glsl
float x = (noise - 0.5) * 0.8;
x += (0.4 - abs(x)) *  sin(3 * w) * pow(sin(w), 6) * 0.45;
```

#### Fog Trail

之前我们为雨迹创建了两种遮罩，我们可以将遮罩分离出来，进行更多的操作：

```glsl
// create fog trail
// ----------------
// create mask that will erase any trail that is below the raindrop
float trailErasingMask = smoothstep(-0.05, 0.05, raindropPos.y);
// create mask that will fade out the trail
float trailFadingMask = smoothstep(0.5, y, gridUV.y);
float fogTrail = trailErasingMask * trailFadingMask;
trail *= fogTrail;
```

我们再次使用`smoothstep`函数，生成这样的轨迹：

```glsl
fogTrail *= smoothstep(0.05, 0.04, abs(raindropPos.x));
```

![](20241204174014.png)

---

### Final Result

我们之所以能够看到窗户上的雨水，是因为雨水能够对光线之间的交互作用，所以我们所创建的雨滴与雨迹，实际上是为了创建用于偏移UV的二维向量：

```glsl
float2 offset = raindrop * raindropPos + trail * trailPos;
```

