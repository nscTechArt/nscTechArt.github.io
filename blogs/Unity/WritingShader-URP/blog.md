---
layout: page
permalink: /blogs/Unity/WritingShader-URP/index.html
title: 在URP中手写Shader
---

# 在URP中手写Shader

> 本文翻译自cyan的博客 [Writing Shader Code in Universal RP (v2) | Cyanilux](https://www.cyanilux.com/tutorials/urp-shader-code/)
>
> 由于结合了自己的想法和认识，不一定对

[TOC]

## ShaderLab

### Properties

我们把需要在公开在Inspector面板中的材质属性在Properties中声明

```glsl
Properties 
{
//  [name] ("[name in inspector]", [type]) = [default value]
    _BaseMap ("Base Texture", 2D) = "white" {}
    _BaseColor ("Base Colour", Color) = (0, 0.66, 0.73, 1)
//  _ExampleDir ("Example Vector", Vector) = (0, 1, 0, 0)
//  _ExampleFloat ("Example Float (Vector1)", Float) = 0.5
}
```

我们也可以通过 C# 脚本更改这些属性（例如使用 material.SetColor / SetFloat / SetVector 等）。

如果每种材质的属性都不同，我们必须在属性块和 UnityPerMaterial CBUFFER 中包含这些属性，以便正确支持 SRP Batcher（稍后将对此进行说明）。

如果所有着色器都应该共享相同的值，那么我们就不必在这里公开它们。相反，我们只需在稍后的 HLSL 代码中定义它们即可。我们仍然可以在 C# 中使用 Shader.SetGlobalColor / SetGlobalFloat / SetGlobalVector 等设置它们。

------

### SubShader

Shader可以包含多个SubShader。Unity 将使用 GPU 支持的第一个 SubShader 。

同时我们也可以使用`RenderPipeline`的Tag来控制特定管线下对SubShader的使用。

如果不存在支持的SubShader，我们还可以定义FallBack。没有定义FallBack的话，则会显示洋红色的ErrorShader

在每个SubShader中，开发者会使用HLSL code来支持

------

#### RenderPipeline

使用**RenderPipeline**的Tag可以避免SubShader被错误的渲染管线使用

我们通常使用这两个Tag：**UniversalPipeline** / **HDRenderPipeline**

默认内置渲染管线没有对应的Tag，或者说默认为空

[^注意，UniversalRenderPipeline是已经过时的Tag]: 

---

#### Queue

**Queue**的Tag对于确定何时渲染对象非常重要，不过也可以通过Inspector上Overload材质所用的渲染队列

渲染队列的Tag只能是以下预定义的Tag之一：

- “Background” (1000)
- “Geometry” (2000)
- “AlphaTest” (2450)
- “Transparent” (3000)
- “Overlay” (4000)

开发者也可以在名称后添加 +N 或 -N，以更改Shader所使用的队列值。例如，"Geometry+1 "将是 2001，因此将在使用 2000 的其他对象之后渲染。

**2500** 以下的值被视为 **不透明**，因此使用相同队列值的对象会**从前向后**渲染（靠近摄像机的对象先渲染）

**2501** 以上为**透明**，渲染时从后向前（较远的物体先渲染）。由于透明着色器往往不使用深度测试/写入，因此更改队列将改变着色器与其他透明对象的排序方式。

---

### Pass

Pass被定义在SubShader中，Pass中可以使用一个明确的**LightMode**的Tag，用来决定什么阶段/如何使用这个Pass。

但是根据Shader的用途不同，可能在Shader中使用一个Pass就可以解决问题，这种情况下就不用声明明确的**LightMode**。

为了让SRP Batcher生效，**一个Shader中的所有Pass都必须有相同的UnityPerMaterial CBUFFER**，请留意，UsePass的调用可能会导致SRP Batcher失效，因为它会使用之前的Shader里定义的 CBUFFER。

---

#### LightMode Tag

URP中使用一下**LightMode**

- UniversalForward 用于渲染前向渲染路径中的对象。渲染带有照明的几何体。
- ShadowCaster 用于投射阴影
- DepthOnly 如果启用了MSAA或者在不支持复制深度缓冲的平台上，会在**Depth Prepass**中来生成**Depth Texture**(_CameraDepthTexture)
- DepthNormals 在 **Depth Normals Prepass**生成CameraDepthTexture和CameraNormalsTexture
- Meta 与LightMap Baking相关
- SRPDefaultUnlit 默认的LightMode，如果没有手动定义的话。也会用来Muiti-Pass中，但是这会导致SRP Batcher失效
- UniversalGBuffer 用于渲染延迟渲染路径中的对象。将几何体渲染到多个缓冲区中，但不计算光照
- UniversalForwardOnly 与 "UniversalForward "类似，但可用于在延迟路径中将对象渲染为正向对象，如果着色器的数据无法在 GBuffer中显示，比如clearcoat normals

---

#### Cull

在Pass中，可以包含**Cul**l指令来控制渲染三角形的哪个面

- Cull Back 
- Cull Front
- Cull Off

至于哪个面是正面，哪个面是反面，取决于三角形顶点的环绕顺序

---

#### Depth Test/Write

在Pass中，可以使用**ZTest**和**ZWrite**的指令

深度测试会根据片段的深度值与深度缓冲区中的值的比较情况来决定如何渲染片段。例如，LEqual仅在片段深度小于或等于缓冲区值时才会呈现片段。

深度写入决定测试通过时片段的深度值是否替换缓冲区中的值。关闭 ZWrite 时，深度值保持不变。这主要适用于透明对象，以实现正确的混合效果，但这也是难以对透明对象进行排序的原因，有时它们会以不正确的顺序呈现。

与此相关的还有 **Offset**操作，它使用两个参数（系数、单位）偏移深度值

#### BLend & Transparency

Pass的混合模式决定了片段结如何与摄像机色彩target/buffer中的现有值相结合

---

### Multi-Pass

如果在Shader中使用了额外的LightMode为空或SRPDefaultUnlit的Pass，这就是通常所指的Multi-Pass。

**Multi-Pass会导致 SRP Batcher失效**

可以使用以下方案来实现Multi-Pass

- 将特定的Pass作为一个单独的Shader，赋给一个新的材质，然后放在MeshRender的第二个材质槽位
- RenderObjects (Override Material) 给特定的LayerMask的物体使用Override Material来覆盖渲染。这种方案最好是用于大量物体的绘制，不然会造成Layer的浪费。同时Override Material也不会继承之前的Shader的属性或者纹理
- RenderObjects (Custom LightMode) 可以自定义lightmode tag， render objects就仅会处理那些有这个tag的pass

---

## HLSL

### HLSLPROGRAM & HLSLINCLUDE

在每个 ShaderLab 的 Pass中，我们使用 HLSLPROGRAM 和 ENDHLSL 标签定义 HLSL 代码块。每个代码块都必须包含顶点和片段着色器。我们使用 #pragma vertex/fragment 来设置要使用的函数。

---

### Variables

#### Scalar

包含

- bool
- float 32 位浮点数。一般用于世界空间位置、纹理坐标或涉及复杂函数（如三角函数或幂/幂指数
- half 16 位浮点数。一般用于short vectors、方向、object空间位置
- double 64 位浮点数。不能用作输入/输出
- real 在URP和HDRP中，自动根据函数所使用的数据类型而调整，通常是float或half，后者优先度更高
- int 32 位signed整数
- uint 32 位无符号整数（不支持 GLES2 ，GLES2 将其定义为 int）
- fixed 在HLSL中不被支持，会被处理为Half

---

#### Vector

不用解释

---

#### Matrix

矩阵第一个整数是矩阵的行数，第二个整数是矩阵的列数。例如 ：

- `float4x4` – 4 rows, 4 columns
- `int4x3` – 4 rows, 3 columns
- `half2x1` – 2 rows, 1 column
- `float1x4` – 1 row, 4 columns

---

#### Textures

在URP中，可以使用在全局下使用以下宏来定义纹理

```glsl
TEXTURE2D(textureName);
SAMPLER(sampler_textureName);
```

对于每个纹理，我们还定义了一个 SamplerState，其中包含纹理导入设置中的wrap和filter模式。或者，我们也可以定义一个inline采样器，例如 `SAMPLER(sampler_linear_repeat)`。

在片段着色器中，我们会使用另一个宏来采样纹理

```glsl
float4 colorA = SAMPLE_TEXTURE2D(textureName, sampler_textureName, uv);
float4 colorB = SAMPLE_TEXTURE2D_LOD(textureName, sampler_textureName, uv, 0);
```

其他类型的纹理也会有对应的宏来实现定义和采样

---

#### Array

在HLSL中，可以使用数组，并且支持在循环中使用

但是，如果数组的大小是固定的，并且循环不会提前终止，那么最好改成多次复制粘贴相同的代码，同时调整index索引

在HLSL中使用数组时，最好通过 `Shader.SetGlobalVectorArray` 或者 `Shader.SetGlobalFloatArray` ，而不是`material.SetVector/FloatArray` 来给数组赋值， 因为数组不能在ShaderLab的Properties中被正确地声明，也就不能被UnityPerMaterial CBUFFER所包含。如果使用 SRP Batcher 进行批处理，多个材质尝试使用不同的数组会导致出现合批失效，所有对象的值都会根据屏幕上的渲染内容而发生变化。通过全局设置，只能使用一个数组，从而避免了这种情况。

请注意，`SetArray` 方法的最大的数组大小也仅限于 1023。如果您需要更大的数组，可能需要尝试其他解决方案，例如StructuredBuffer，前提是目标平台支持它们。

---

#### Buffer

数组的另一种替代方法是使用计算缓冲区，在 HLSL 中被称为结构缓冲区（StructuredBuffer）（只读）。另外，RWStructuredBuffer 也可用于读写，但仅支持像素/片段和计算着色器）

要使用这些缓冲区，至少还需要 `#pragma target 4.5`。并非所有平台都支持计算缓冲区（有些平台可能不支持顶点着色器中的 StructuredBuffer）。您可以在运行时使用 C# 中的 `SystemInfo.supportsComputeShaders` 来检查平台是否支持它们。

---

### Functions

常规的函数相关的就不赘述了，值得留意的是以下情况

- `inline` 这是默认修饰符，也是函数实际可以使用的唯一修饰符，因此指定它并不重要。它表示编译器将为每次调用生成一个函数副本。这样做是为了减少调用函数的开销。
- `#define` 宏会在编译着色器之前被处理，它们会被定义取代，并替换掉任何参数。例如 ：

