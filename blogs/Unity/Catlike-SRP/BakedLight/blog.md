---
layout: page
permalink: /blogs/Unity/Catlike-SRP/BakedLight/index.html
title: Baked Light
---

### Baked Light

---

#### 1 Baking Static Light

我们已经实现了实时的光照计算，但是，光照计算也可以预先计算，然后存储在light map与light probe中。预先计算光照主要有两个目的，一是减少实时的计算量，二是添加无法实时计算的间接光照。后者是我们所说的全局光照的一部分，也就是并非直接来自光照的光，而是间接的通过环境、反射、以及自发光而来。

烘焙光照的缺点是它是静态的，无法在运行时更改，同时光照结果需要存储，增加了内存与储存的占用。

##### 1.1 Scene Lighting Settings

Unity中的每个场景对应一个独立的GI，烘培光照在*Mixed Lighting*中开启，同时我们设置*Lighting Mode*为*Baked Indirect*，代表我们将烘培所有静态间接光照。

*Lightmapping Settings*的大部分设置我们先使用默认值，*LightMap Resolution*降低至20， 同时关闭*Compress Lightmaps*，将*Directional Mode*设置为*Non-Directional*，另外我们使用*Progressive GPU*渲染。

> 如果将*Directional Mode*设置为*Directional*，方向性的数据也会被烘培，法线贴图就可以影响烘焙光照，但是我们还没有实现法线映射，所有暂时设置为*Non-Directional*

##### 1.2 Static Objects

搭建出一个场景用于烘焙光照的测试：

<img src="files/scene.png" style="zoom: 33%;" />

场景中只有一个光源：平行光。将平行光的*Mode*设置为*Mixed*，告诉Unity烘焙这个灯光的间接光照，并且不会影响它的实时光照。

我们要将地面和所有的cube（包含组成房屋的cube）都纳入烘培过程。选择这些物体的*MeshRenderer*，并启用*Contribute Global Illumination*。这一步会自动将这些物体的*Receive Global Illumination*切换至*Lightmaps*，代表这些物体会从lightmap中获取GI。我们得到的lightmap如下：

![](files/微信截图_20240313161844.png)

lightmap中并没有场景中的球体，因为这些球体是动态的，不会参与GI运算，它们需要依赖light probes，我们后面会接着探讨这个。

同时，如果我们将cube的*Receive Global Illumination*模式切换至*LightProbes*，那么这些cube也不会出现在lightmap上，但是仍然会贡献GI计算

##### 1.3 Fully-Baked Light

现在烘培的得到的光照主要是蓝色的，这主要是来自天空盒，light map中间较亮的部分是光线在墙壁与地面之间碰撞的结果。

我们也可以将所有的光照都烘焙进lightmap，将平行光的*Mode*设置为*Baked*，这样一来就没有实时光照了，但是由于直接光照的部分被作为间接光照烘焙进了lightmap，我们得到的lightmap会变得很亮。

![](files/微信截图_20240313162211.png)

---

#### 2 Sample Baked Light

现在，场景中的物体变成了完全的黑色，这是因为没有实时光照了，但是我们的shader还没有GI的相关代码，所以接下来我们要在shader中采样lightmap

##### 2.1 Global Illumination

我们将GI相关的代码放在*ShaderLibrary/GI.hlsl*中。定义一个**GI **struct，以及**GetGI**函数来获取GI，暂时先输出`lightMapUV`用来debug。由于间接光照来自各个方向，所以我们只能用作漫反射光照。

```glsl
#ifndef CUSTOM_GI_INCLUDED
#define CUSTOM_GI_INCLUDED

struct GI
{
	float3 diffuse;
};

GI GetGI(float2 lightMapUV)
{
	GI gi;
	gi.diffuse = float3(lightMapUV, 0.0);
	return gi;
}
```

> Specular GI需要使用反射探针来实现，或者通过屏幕空间反射来实现

给GetLighting添加一个GI的参数，同样直接输出来debug

```glsl
float3 GetLighting (Surface surfaceWS, BRDF brdf, GI gi)
{
	ShadowData shadowData = GetShadowData(surfaceWS);
	float3 color = gi.diffuse;
	...
	return color;
}
```

将*GI.hlsl*包含进*LitPass*

```glsl
#include "../ShaderLibrary/GI.hlsl"
#include "../ShaderLibrary/Lighting.hlsl"
```

我们在`LitPassFragment`中获取`GI`，并初始化，传给`GetLighting`

```glsl
GI gi = GetGI(0.0);
float3 color = GetLighting(surface, brdf, gi);
```

##### 2.2 Light Map Coordinates

为了使用`lightMapUV`，Unity需要将`lightMapUV`传递给Shader。我们需要让管线对每个lightmapped的物体执行这个操作。完成这一步，我们需要设置**CameraRenderer**.`DrawVisibleGeometry`中drawing settings中的per-object data这是为**PerObjectData.**`Lightmaps`

```c#
var drawingSettings = new DrawingSettings(
	unlitShaderTagID, sortingSettings)
{
	enableDynamicBatching = useDynamicBatching.
	enableInstancing = useGPUInstancing,
	perObjectData = PerObjectData.Lightmaps
}
```

这样一来，Unity会渲染有*LIGHTMAP_ON*关键字的shader变体的lightmapped物体，所以，我们在*Lit* Shader中的*CustomLit* pass中添加这一关键字

```glsl
#pragram multi_compile _ _LIGHTMAP_ON
```

lightmap的UV坐标属于vertex data的一部分，我们需要将其从**Attributes**中传递到**Varyings**中，从而在`LitPassFragment`中使用。但是，我们希望只有使用到lightmap时才会进行这个操作，所以我们可以通过宏：`GI_ATTRIBUTE_DATA` `GI_VARYINGS_DATA` `TRANSFER_GI_DATA`来实现

```glsl
struct Attributes
{
	...
	GI_ATTRIBUTE_DATA
	...
};

struct Varyings {
	...
	GI_VARYINGS_DATA
	...
};

Varyings LitPassVertex (Attributes input) {
	...
	TRANSFER_GI_DATA(input, output);
	...
}
```

GetGI函数所需要的参数，我们通过宏`GI_FRAGMENT_DATA`来实现

```glsl
GI gi = GetGI(GI_FRAGMENT_DATA(input));
```

当然了，这些宏并不是Unity提供给我们的，我们需要在*GI.hlsl*中自己定义出来。当*LIGHTMAP_ON*这个关键字启用时，这些宏对应真正的代码，否则这些宏可以直接定义为nothing

```glsl
#if defined(LIGHTMAP_ON)
	#define GI_ATTRIBUTE_DATA float2 lightMapUV : TEXCOORD1;
	#define GI_VARYINGS_DATA float2 lightMapUV : VAR_LIGHT_MAP_UV;
	#define TRANSFER_GI_DATA(input, output) output.lightMapUV = input.lightMapUV;
	#define GI_FRAGMENT_DATA(input) input.lightMapUV
#else
	#define GI_ATTRIBUTE_DATA
	#define GI_VARYINGS_DATA
	#define TRANSFER_GI_DATA(input, output)
	#define GI_FRAGMENT_DATA(input) 0.0
#endif
```

现在，我们可以看到场景中的静态烘焙物体显示的是它们的light map uv，动态物体仍然保持全黑的状态。

![](files/20240313170829.png)

##### 2.3 Transformed Light Map Coordinates

light map的坐标通常要么是Unity自动为每个mesh生成，要么是导入的mesh数据中的一部分。我们需要添加光照贴图的uv变换的支持。因为光照贴图的uv坐标也需要传入GPU，所以我们将其添加进`UnityPerDraw`，需要留意的是，虽然`unityDynamicLightmapST`已经过时了，但是还是需要一并添加。

```glsl
CBUFFER_START(UnityPerDraw)
	float4x4 unity_ObjectToWorld;
	float4x4 unity_WorldToObject;
	float4 unity_LODFade;
	real4 unity_WorldTransformParams;

	float4 unity_LightmapST;
	float4 unity_DynamicLightmapST;
CBUFFER_END
```

同时还需要修改TRANSFER_GI_DATA这个宏。请留意，当宏的代码涉及多行时，需要添加下划线。

```
#define TRANSFER_GI_DATA(input, output) \
    output.lightMapUV = input.lightMapUV * \
    unity_LightmapST.xy + unity_LightmapST.zw;
```

下图是经过变换的lightmap

![](files/20240313172246.png)

##### 2.4 Sampling the Light Map

Unity中的光照贴图在Shader中可以通过`unity_Lightmap`获取，我们需要引用EntityLighting.hlsl文件，这个文件包含了`unity_Lightmap`的声明和一些其他有用的函数

```glsl
#include "Packages/com.unity.render-pipelines.core/ShaderLibrary/EntityLighting.hlsl"

TEXTURE2D(unity_Lightmap);
SAMPLER(samplerunity_Lightmap);
```

我们创建一个`SampleLightMap`函数，当有lightmap存在时，我们调用`SampleSingleLightMap`，否则返回0。我们在`GetGI`中调用`SampleLightMap`，从而为漫反射赋值

```glsl
float3 SampleLightMap(float2 lightMapUV)
{
#if define(LIGHTMAP_ON)
	return SampleSingleLightmap(lightMapUV);
#else
	return 0.0;
#endif
}

GI GetGI(float2 lightMapUV)
{
	GI gi;
	gi.diffuse = SampleLightMap(lightMapUV);
	return gi;
}
```

实际上，`SampleSingleLightMap`还需要其他参数，首先需要传给它光照贴图和对应的采样器，我们通过`TEXTURE_ARGS`这个宏来完成这一步

```glsl
return SampleSingleLightmap(TEXTURE_ARGS(unity_Lightmap, samplerunity_Lightmap), lightMapUV);
```

其次，SampleSingleLightMap还想要应用光照贴图的缩放和平移，但是我们已经在UV中实现好了，所以这里就直接传给一个单位变换

```glsl
return SampleSingleLightmap(
	TEXTURE_ARGS(unity_Lightmap, samplerunity_Lightmap), 
	lightMapUV，
	float4(1.0, 1.0, 0.0, 0.0)
);
```

接下来是一个布尔值，用来表示光照贴图是否有压缩，这与*UNITY_LIGHTMAP_FULL_HDR*这个关键字有关。最后一个参数是一个`float4`，包含了光照贴图的解码方式

```glsl
return SampleSingleLightmap(
	TEXTURE_ARGS(unity_Lightmap, samplerunity_Lightmap), 
	lightMapUV，
	float4(1.0, 1.0, 0.0, 0.0),
#if defined(UNITY_LIGHTMAP_FULL_HDR)
	false,
#else
	true,
#endif
	float4(LIGHTMAP_HDR_MULTIPLIER, LIGHTMAP_HDR_EXPONENT, 0.0, 0.0)
);
```

现在我们已经可以得到采样结果了

![](files/20240313174815.png)

##### 2.5 Disabling Environment Lighting

可以看到烘焙光照现在处于一个很亮的状态，因为它同样包含了来自天空的间接光照。我们可以设置环境光的Itensity Multiplier为0，这样我们就专注于场景中的单个平行光了

![](files/20240313175145.png)

> 写到这里我才发现一直没把地板加入GI。。。

---

#### 3 Light Probes

场景中的动态物体并不会影响烘培GI，但是却可以通过光照探针受到GI的影响。光照探针是存在于场景中的一个点，它通过三阶多项式，尤其是L2球谐来烘培所有入射光。光照探针放置在场景周围，Unity 在每个对象之间进行插值，以得出其位置的最终光照近似值。

##### 3.1 Light Probe Group

如何在Unity的场景中创建光照探针就不说了。

场景中可以存在多个光照探针组。Unity会将所有探针组合在一起，然后创建一个四面体体积网格来链接它们。每个动态物体都会在这个四面体内部。四面体四个顶点上的光照探针会通过插值的方式，最终得出应用在动态物体上的光照。如果一个物体最终超出了探针覆盖的区域，则使用最近的三角形，因此照明可能会显得很奇怪

默认情况下，当选中一个动态物体时，Unity会为我们显示出影响该物体的探针和物体所在位置上的插值结果。

![](files/20240313210520.png)

摆放光照探针的位置取决于场景。首先，动态物体的目标位置需要有光照探针。其次，光照探针也需要在光照改变的地方拜访。每个探针都是插值的一个端点。第三，不要将光照探针放在烘焙的几何体内部，这样的话探针就会变成黑色的。最后，光照探针的原理是插值，如果光照在墙的两面不一样，那就将探针尽可能地靠近两面墙放置，这样就不会有物体用的是墙两侧的光照的插值结果。

##### 3.2 Sampling Probes

插值的光照探针数据也需要针对每个物体来传递给GPU，这一步需要像lightmap一样，告知Unity。

```c#
perObjectData = PerObjectData.Lightmaps | PerObjectData.LightProbe
```

对应的，`UnityPerDraw`需要包含七个`float4`向量，代表了多项式的红绿蓝分量，这些向量都是以`unity_SH*`命名，其中的`*`是A、B或C。

```glsl
CBUFFER_START(UnityPerDraw)
	…

	float4 unity_SHAr;
	float4 unity_SHAg;
	float4 unity_SHAb;
	float4 unity_SHBr;
	float4 unity_SHBg;
	float4 unity_SHBb;
	float4 unity_SHC;
CBUFFER_END
```

我们创建一个新的函数`SampleLightProbe`，用来采样GI中的light probe。采样需要一个方向向量，所以我们传入世界空间下的surface结构体。

如果当前的物体使用了light map，`SampleLightProbe`就返回0，否则返回0和`SampleSH9`的最大值。SampleSH9接受probe data和法线向量作为参数，其中probe data由一个系数数组提供。

```
float3 SampleLightProbe(Surface surfaceWS)
{
#if defined(LIGHTMAP_ON)
	return 0.0;
#else
	float4 coefficients[7];
    coefficients[0] = unity_SHAr;
    coefficients[1] = unity_SHAg;
    coefficients[2] = unity_SHAb;
    coefficients[3] = unity_SHBr;
    coefficients[4] = unity_SHBg;
    coefficients[5] = unity_SHBb;
    coefficients[6] = unity_SHC;
    return max(0.0, SampleSH9(coefficients, surfaceWS.normal));
#endif
}
```

在`GetGI`中，我们需要传进surface，同时加入`SampleLightProbe`的计算结果

```
GI GetGI(float2 lightMapUV, Surface surfaceWS)
{
	GI gi;
	gi.diffuse = SampleLightMap(lightMapUV) + SampleLightProbe(surfaceWS);
	return gi;
}
```

最后，修改`LitPassFragment`中`GetGI`的调用，我就不写了。得到的结果是这样的：

![](files/20240313215137.png)

##### 3.3 Light Probe Proxy Volumes

对于较小的动态物体，光照探针的效果很好，因为光照探针的计算就是基于点的。但是对于一些较大的物体，效果可能会很差。比如，我们在场景中加入两个缩放的cube，因为它们所在的位置在一个较暗的区域内，然而采样就只是根据这个点而进行的，所以这两个cube整体都会很暗，显然效果是不对的。

![](files/20240313215836.png)

所以我们要使用light probe proxy volume，简称LPPV，使用方法是：给动态物体添加*LightProbeProxyVolume*组件，然后将*Light Prob*e模式设置为*Use Proxy Volume*，同时将`Resolusion Mode`设置为`Custom`

![](files/20240313220355.png)

##### 3.4 Sampling LPPVs

LPPV也同样需要针对每个物体将数据传递给GPU，我们需要启用`PerObjectData.LightProbeProxyVolume`

```c#
perObjectData =
    PerObjectData.Lightmaps | PerObjectData.LightProbe |
    PerObjectData.LightProbeProxyVolume
```

对于UnityPerDraw，我们需要添加四个变量

```glsl
CBUFFER_START(UnityPerDraw)
	…

	float4 unity_ProbeVolumeParams;
	float4x4 unity_ProbeVolumeWorldToObject;
	float4 unity_ProbeVolumeSizeInv;
	float4 unity_ProbeVolumeMin;
CBUFFER_END
```

volume data存储在3D纹理`unity_ProbeVolumeSH`中，我们需要在GI.hlsl中声明纹理及其采样器。

```glsl
TEXTURE3D_FLOAT(unity_ProbeVolumeSH);
SAMPLER(samplerunity_ProbeVolumeSH);
```

我们使用`unity_ProbeVolumeParams`的x分量来判断当前使用的是LPPV还是插值的光照探针，如果判断为前者，我们通过`SampleProbeVolumeSH4`来采样volume。

```glsl
    if (unity_ProbeVolumeParams.x) {
        return SampleProbeVolumeSH4(
            TEXTURE3D_ARGS(unity_ProbeVolumeSH, samplerunity_ProbeVolumeSH),
            surfaceWS.position, surfaceWS.normal,
            unity_ProbeVolumeWorldToObject,
            unity_ProbeVolumeParams.y, unity_ProbeVolumeParams.z,
            unity_ProbeVolumeMin.xyz, unity_ProbeVolumeSizeInv.xyz
        );
    }
    else {
        float4 coefficients[7];
        coefficients[0] = unity_SHAr;
        coefficients[1] = unity_SHAg;
        coefficients[2] = unity_SHAb;
        coefficients[3] = unity_SHBr;
        coefficients[4] = unity_SHBg;
        coefficients[5] = unity_SHBb;
        coefficients[6] = unity_SHC;
        return max(0.0, SampleSH9(coefficients, surfaceWS.normal));
    }
```

可以看到修改的结果

![](files/20240313221903.png)

---

#### 4 Meta Pass

间接漫反射光照会在表面之间来回弹射，所以应该受到漫反射反射率的影响。当前我们并没有实现这一步，因为Unity会使用一个特殊的Meta Pass来解决烘焙时的反射光，我们当前还没有实现Meta Pass，所以Unity默认我们的表面都是全白的。

##### 4.1 Unified Input

添加一个新的Pass意味着我们要重新定义Shader属性，我们可以将`UnityPerMaterial`buffer以及base texture从LitPass中分离出来，放在一个新的文件*Shaders/LitInput.hlsl*中。另外，我们也会使用`TransformBaseUV` `GetBase` `GetCutoff` `GetMetallic` `GetSmoothness`函数来隐藏instancing相关的代码。

```
#ifndef CUSTOM_LIT_INPUT_INCLUDED
#define CUSTOM_LIT_INPUT_INCLUDED

TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);

UNITY_INSTANCING_BUFFER_START(UnityPerMaterial)
	UNITY_DEFINE_INSTANCED_PROP(float4, _BaseMap_ST)
	UNITY_DEFINE_INSTANCED_PROP(float4, _BaseColor)
	UNITY_DEFINE_INSTANCED_PROP(float, _Cutoff)
	UNITY_DEFINE_INSTANCED_PROP(float, _Metallic)
	UNITY_DEFINE_INSTANCED_PROP(float, _Smoothness)
UNITY_INSTANCING_BUFFER_END(UnityPerMaterial)

```

```glsl
float2 TransformBaseUV (float2 baseUV) {
	float4 baseST = UNITY_ACCESS_INSTANCED_PROP(UnityPerMaterial, _BaseMap_ST);
	return baseUV * baseST.xy + baseST.zw;
}

float4 GetBase (float2 baseUV) {
	float4 map = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, baseUV);
	float4 color = UNITY_ACCESS_INSTANCED_PROP(UnityPerMaterial, _BaseColor);
	return map * color;
}

float GetCutoff (float2 baseUV) {
	return UNITY_ACCESS_INSTANCED_PROP(UnityPerMaterial, _Cutoff);
}

float GetMetallic (float2 baseUV) {
	return UNITY_ACCESS_INSTANCED_PROP(UnityPerMaterial, _Metallic);
}

float GetSmoothness (float2 baseUV) {
	return UNITY_ACCESS_INSTANCED_PROP(UnityPerMaterial, _Smoothness);
}

#endif
```

我们在SubShader的顶部，通过`HLSLINCLUDE`就能为每个Pass引用*LitInput.hlsl*

```glsl
SubShader {
    HLSLINCLUDE
    #include "../ShaderLibrary/Common.hlsl"
    #include "LitInput.hlsl"
    ENDHLSL

    …
}
```

我们需要删除掉LitPass中冗余的代码

```glsl
//#include "../ShaderLibrary/Common.hlsl"
…

//TEXTURE2D(_BaseMap);
//SAMPLER(sampler_BaseMap);

//UNITY_INSTANCING_BUFFER_START(UnityPerMaterial)
	//…
//UNITY_INSTANCING_BUFFER_END(UnityPerMaterial)
```

同时调整Shader属性的获取，这里就不写了，ShadowCasterPass也需要同样的操作。

##### 4.2 Unlit

比较简单，就不写了

##### 4.3 Meta Light Mode

在*Lit*和*Unlit* Shader中添加新的Pass，将其*LightMode*设置为*Meta*。Meta Pass需要culling始终为off，同时没有multi compile的指令。同时创建*MetaPass.hlsl*，我们将具体的实现放在这个文件中

```glsl
Pass
{
	Tags
	{
		"LightMode" = "Meta"
	}
	
	Cull Off
	
	HLSLPROGRAM
	#pragram target 3.5
	#pragram vertex MetaPassVertex
	#pragram fragment MetaPassFragment
	#include "MetaPass.hlsl"
	ENDHLSL
}
```

我们将会需要获取表面的diffuse reflectivity，所以我们需要在`MetaPassFragment`中获取`BRDF`，同时我们还需要使用到`Surface`，`Shadows`，`Light`这些文件。我们只需要知道物体空间的信息和UV，并把clip space的位置设置为0。我们先将最终输出值设置为0

```glsl
#ifndef CUSTOM_META_PASS_INCLUDED
#define CUSTOM_META_PASS_INCLUDED

#include "../ShaderLibrary/Surface.hlsl"
#include "../ShaderLibrary/Shadows.hlsl"
#include "../ShaderLibrary/Light.hlsl"
#include "../ShaderLibrary/BRDF.hlsl"

struct Attributes {
	float3 positionOS : POSITION;
	float2 baseUV : TEXCOORD0;
};

struct Varyings {
	float4 positionCS : SV_POSITION;
	float2 baseUV : VAR_BASE_UV;
};

Varyings MetaPassVertex (Attributes input) {
	Varyings output;
	output.positionCS = 0.0;
	output.baseUV = TransformBaseUV(input.baseUV);
	return output;
}

float4 MetaPassFragment (Varyings input) : SV_TARGET {
	float4 base = GetBase(input.baseUV);
	Surface surface;
	ZERO_INITIALIZE(Surface, surface);
	surface.color = base.rgb;
	surface.metallic = GetMetallic(input.baseUV);
	surface.smoothness = GetSmoothness(input.baseUV);
	BRDF brdf = GetBRDF(surface);
	float4 meta = 0.0;
	return meta;
}

#endif
```

完成MetaPass后，再次烘焙，我们会发现所有的间接光照消失了，因为黑色的表面什么都不会反射。

![](files/20240313231918.png)

##### 4.4 Light Map Coordinates

我们要再次使用的光照贴图的UV坐标，但是不同的是，我们在顶点着色器中所使用的object space是基于`lightMapUV`的

```glsl
struct Attributes
{
	float3 positionOS : POSITION;
	float2 baseUV : TEXCOORD0;
	float2 lightMapUV : TEXCOORD1;
};

...

Varyings MetaPassVertex (Attributes input)
{
	Varyings output;
	input.positionOS.xy = input.lightMapUV * unity_lightMapST.xy + unity_lightmapST.zw;
	output.positionCS = TransformWorldToHClip(input.positionOS);
	output.baseUV = TransformBaseUV(input.baseUV);
	return output;
}
```

但是我们也并非完全不需要顶点本身的object space坐标，因为这可能会导致Shader失效，例如OpenGL明确地会使用到顶点本身的object space坐标的Z分量。我们参考Unity的代码，设置一个dummy assignment

```glsl
input.positionOS.xy = input.lightMapUV * unity_LightmapST.xy + unity_lightmapST.zw;
input.positionOS.z = input.positionOS.z > 0.0 ? FLT_MIN : 0.0;
```

##### 4.5 Diffuse Reflectivity

Meta Pass可以被用来生成不同的数据，具体生成的数据是通过bool4 `unity_MetaFragmentControl`来判断的。

```glsl
bool4 unity_MetaFragmentControl;
```

如果`unity_MetaFragmentControl`的X分量对应的flag被启用了，那就说明我们需要获取diffuse reflectivity

```glsl
float meta = 0.0;
if (unity_MetaFragmentControl.x)
{
	meta = float4(brdf.diffuse, 1.0);
}
return meta;
```

这足以为反射光照提供颜色值了，但是Unity的Meta Pass还做了一些额外的工作，它会加上specular reflectivity与roughness的结果的一半的值，背后的原理是镜面反射强度高但粗糙的材质，也会传递一些间接光照。

```glsl
meta.rgb += brdf.specular * brdf.roughness * 0.5;
```

然后，还有一些运算

```glsl
meta.rgb = min(PositivePow(meta.rgb, unity_OneOverOutputBoost), unity_MaxOutputValue);
```

这样一来，我们就能得到有颜色的间接光照了，如图所示

![](files/20240313234757.png)

在之前，为了debug，让`LitPassFragment`的`GetLighting`只输出间接光照的结果，现在我们可以将surface的diffuse reflectivity加回来了。

```glsl
float3 color = gi.diffuse * brdf.diffuse;
```

![](files/20240313235112.png)

开启环境反射

![](files/20240313235202.png)

最后，我们将平行光的模式设置为*Mixed*，也就是启用实时光照，然后烘焙间接光照，得到的结果如下

![](files/20240313235325.png)

---

#### 5 Emissive Surfaces

有些表面会自发光，这样即使没有光照，这些表面也是可见的。我们并不能将其视为光源，因为它不会影响其他表面，但是却可以贡献烘培光照。

##### 5.1 Emitted Light

我们添加两个新的Shader属性，自发光贴图和自发光颜色。

```glsl
[NoScaleOffset] _EmissionMap("Emission", 2D) = "white" {}
[HDR] _EmissionColor("Emission", Color) = (0.0, 0.0, 0.0, 0.0)
```

修改*LitInput.hlsl*

```glsl
TEXTURE2D(_BaseMap);
TEXTURE2D(_EmissionMap);
SAMPLER(sampler_BaseMap);

UNITY_INSTANCING_BUFFER_START(UnityPerMaterial)
	UNITY_DEFINE_INSTANCED_PROP(float4, _BaseMap_ST)
	UNITY_DEFINE_INSTANCED_PROP(float4, _BaseColor)
	UNITY_DEFINE_INSTANCED_PROP(float4, _EmissionColor)
	…
UNITY_INSTANCING_BUFFER_END(UnityPerMaterial)

…

float3 GetEmission (float2 baseUV) {
	float4 map = SAMPLE_TEXTURE2D(_EmissionMap, sampler_BaseMap, baseUV);
	float4 color = UNITY_ACCESS_INSTANCED_PROP(UnityPerMaterial, _EmissionColor);
	return map.rgb * color.rgb;
}
```

在LitPassFragment中，添加自发光颜色

```glsl
float3 color = GetLighting(surface, brdf, gi);
color += GetEmission(input.baseUV);
return float4(color, surface.alpha);
```

在场景中添加一些自发光的cube，并设置为参与GI

##### 5.2 Baked Emission

自发光通过一个特殊的Pass进行烘培，当`unity_MetaFragmentControl`的y Flag启用时，`MetaPassFragment`就会输出自发光值

```glsl
if (unity_MetaFragmentControl.x) {
    …
}
else if (unity_MetaFragmentControl.y) {
    meta = float4(GetEmission(input.baseUV), 1.0);
}
```

但是`unity_MetaFragmentControl`的y flag并非自动配置的，我们需要对每个材质开启自发光烘培。我们可以显示一个控制自发光开关的调试选项，需要我们在Editor调用LightmapEmissiononProperty

```c#
public override void OnGUI (
    MaterialEditor materialEditor, MaterialProperty[] properties
) {
    EditorGUI.BeginChangeCheck();
    base.OnGUI(materialEditor, properties);
    editor = materialEditor;
    materials = materialEditor.targets;
    this.properties = properties;

    BakedEmission();

    …
}

void BakedEmission () {
    editor.LightmapEmissionProperty();
}
```

现在，材质面板会出现一个GI的下拉选项，默认是*None*。虽然这个按钮的名字是GI，但实际上只影响自发光的烘培，当选中Baked时，lightmapper就会为自发光运行一个单独的pass。还有一个*Realtime*的选项，不过已经是过时的了

![](files/20240314150645.png)

不过现在还是不能生效，因为Unity烘培时，会试着避免单独的自发光pass。如果一个材质的自发光被这是为0，这个材质的自发光烘焙就会被忽略。所以当emission mode改变时，我们需要为所有选中的材质关闭`globalIlluminationFlags`属性中默认的`MaterialGlobalIlluminationFlags.EmissiveIsBlack`。也就是说，只有当需要时才应该开启*Baked*

```c#
void BakedEmission () {
    EditorGUI.BeginChangeCheck();
    editor.LightmapEmissionProperty();
    if (EditorGUI.EndChangeCheck()) {
        foreach (Material m in editor.targets) {
            m.globalIlluminationFlags &=
                ~MaterialGlobalIlluminationFlags.EmissiveIsBlack;
        }
    }
}
```

![](files/20240314151654.png)

---

#### 6 Baked Transparency

烘培半透明物体也是可行的，但是需要我们做一些额外的工作。

##### 6.1 Hard-Coded Properties

很遗憾的是，针对半透明Unity的lightmapper有一个硬编码的方法。它会根据材质的队列来判断材质是opaque，clip还是透明的。然后它会根据_MainTex和 _Color来决定透明度，根据*Cutoff*来判断裁剪值。我们的shader中已经有Cutoff了，但是前两个还没有。

```glsl
[HideInInspector] _MainTex("Texture for Lightmap", 2D) = "white" {}
[HideInInspector] _Color("Color for Lightmap", Color) = (0.5, 0.5, 0.5, 1.0)
```

##### 6.2 Copying Properties

我们现在需要做的是，确保*_Maintex* 与 *_Basemap*所包含的贴图数据一样，并且使用相同的UV，且两个颜色数据也要统一。我们可以在CustomShaderGUI.OnGUI中创建一个新的方法来完成这个工作

```c#
public override void OnGUI (
    MaterialEditor materialEditor, MaterialProperty[] properties
) {
    …

    if (EditorGUI.EndChangeCheck()) {
        SetShadowCasterPass();
        CopyLightMappingProperties();
    }
}

void CopyLightMappingProperties () {
    MaterialProperty mainTex = FindProperty("_MainTex", properties, false);
    MaterialProperty baseMap = FindProperty("_BaseMap", properties, false);
    if (mainTex != null && baseMap != null) {
        mainTex.textureValue = baseMap.textureValue;
        mainTex.textureScaleAndOffset = baseMap.textureScaleAndOffset;
    }
    MaterialProperty color = FindProperty("_Color", properties, false);
    MaterialProperty baseColor =
        FindProperty("_BaseColor", properties, false);
    if (color != null && baseColor != null) {
        color.colorValue = baseColor.colorValue;
    }
}
```

---

#### 7 Mesh Ball

最后，我们再来为实例化物体支持GI。这个实例化的物体是在场景运行时动态创建的，所以它们并不能被烘培。但是我们可以通过一些操作，使它们可以通过光照探针接受烘焙光照。

##### 7.1 Light Probes

想要使用光照探针，我们需要为DrawMeshInstanced新增五个参数

```c#
using UnityEngine;
using UnityEngine.Rendering;

public class MeshBall : MonoBehaviour {
	
	…
	
	void Update () {
		if (block == null) {
			block = new MaterialPropertyBlock();
			block.SetVectorArray(baseColorId, baseColors);
			block.SetFloatArray(metallicId, metallic);
			block.SetFloatArray(smoothnessId, smoothness);
		}
		Graphics.DrawMeshInstanced(
			mesh, 0, material, matrices, 1023, block,
			ShadowCastingMode.On, true, 0, null, LightProbeUsage.CustomProvided
		);
	}
```

我们需要为实例化的物体手动地生成插值光照探针，然后将它们添加进material property block。也就是说，让配置material property block时，我们需要获取实例物体的位置。我们可以获取变换矩阵的最后一列，然后存储在一个临时数组中

```c#
		if (block == null) {
			block = new MaterialPropertyBlock();
			block.SetVectorArray(baseColorId, baseColors);
			block.SetFloatArray(metallicId, metallic);
			block.SetFloatArray(smoothnessId, smoothness);

			var positions = new Vector3[1023];
			for (int i = 0; i < matrices.Length; i++) {
				positions[i] = matrices[i].GetColumn(3);
			}
		}
```

光照探针的创建需要通过`SphereHarmonicsL2`创建

```c#
			for (int i = 0; i < matrices.Length; i++) {
				positions[i] = matrices[i].GetColumn(3);
			}
			var lightProbes = new SphericalHarmonicsL2[1023];
			LightProbes.CalculateInterpolatedLightAndOcclusionProbes(
				positions, lightProbes, null
			);
```

