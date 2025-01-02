---
title: URP中基于Depth Texture的空间重建
date: 2024-08-06 09:40 +0800
categories: [Unity, Rendering]
media_subpath: /assets/img/Unity/24-08-06/
tag: [Unity]
math: true
---

### Motivation

很多后处理效果在实现时，只能从深度纹理中获取深度信息，而无法获取场景中几何体的顶点数据，但其实现方式又需要利用世界空间/相机空间中的坐标。这种情况下，我们就需要从深度纹理中重建世界空间坐标。此外，也有一些其他的重建选项，例如重建世界空间中的法线，或者相机空间中的位置。

无论我们要重建哪种信息，出发点都是深度纹理，我们通过屏幕空间的UV，采样得到当前像素对应的深度值，并进行一些列的空间变换，最终获取所需的信息。

---

### 重建世界坐标

#### 标准方法

重建世界坐标有一套标准的流程，Unity为我们封装了重建的过程，其使用方法可以参考Unity的[这篇博客](https://docs.unity3d.com/Packages/com.unity.render-pipelines.universal@14.0/manual/writing-shaders-urp-reconstruct-world-position.html)。在Unity所提供的函数中，**逆向还原了渲染管线中空间变换**的过程。我们先回顾一下整个过程：

- 在顶点着色器中，顶点从模型空间变换到齐次裁剪空间：$M_{\text{proj}} * M_{\text{view}} *P_{\text{world}} =P_{\text{clip}} $
- 接下来，Unity会为我们执行透视除法，转换到NDC空间：$P_{\text{clip}} / P_{\text{clip}}.w=P_{\text{NDC}}$
  - NDC空间中的XY坐标的范围为$[-1, 1]$，
  - NDC空间中的Z坐标的范围视API而定，但最终存储到深度纹理中的范围为$[0, 1]$

- 对于`SV_POSITION`， Unity会将其XY坐标从$[-1, 1]$再次映射到到$[0,\text{Render Target Resolution}]$的范围上

所以，当我们在物体的片段着色器中重建世界空间坐标时，可以使用下面的数学表达式：


$$
P_{\text{world}}=M^{-1}*P_{\text{ndc}} \\
P_{\text{world}}/= P_{\text{world}}.w
$$
对应在Shader为：

```glsl
float2 positionSS = input.positionHCS.xy / _ScreenParams.xy;
float depth = SampleSceneDepth(positionSS);
float3 positionNDC = float3(positionSS * 2 - 1, depth);
#if UNITY_UV_STARTS_AT_TOP
positionNDC.y = -positionNDC.y;
#endif
float4 positionWS = mul(UNITY_MATRIX_I_VP, float4(positionNDC, 1));
positionWS /= positionWS.w;
```

#### 相机射线方法

URP在SSAO中提供了另一种实现方法，其思路为：**求出该点相较于相机位置的偏移量，在应用到相机位置上**即可。该方法中的重点在于，如何计算出这个偏移量。如下图所示，我们深度信息与相机的近裁截面，构建出两个相似三角形：

![](20250102184528.jpg)

由相似三角形，可得$\vec{P}=\frac{depth}{near}\vec{P^`}$，所以问题变为了求P与相机构建的摄像与近平面的交点位置，而交点位置在近平面上的相对位置是已知的，就是当前像素的屏幕空间坐标。由此，我们只需要知道近平面其中一个顶点的世界坐标，以及近平面在世界空间中的宽高即可。

在实现时，我们创建一个Render Feature，向Shader中传递对应的数据。需要注意的是，我们需要计算的是某点相对于相机的偏移位置，在计算近平面的世界坐标时，我们需要移除视图矩阵中相机自身位移的影响：

```c#
// calculate camera frustum properties
// -----------------------------------
CameraData cameraData = renderingData.cameraData;
Matrix4x4 proj = cameraData.GetProjectionMatrix();
Matrix4x4 viewNoTrans = cameraData.GetViewMatrix();
viewNoTrans.SetColumn(3, new Vector4(0, 0, 0, 1));
Matrix4x4 invViewProj    = (proj * viewNoTrans).inverse;
Vector4 topLeftCorner    = invViewProj.MultiplyPoint(new Vector3(-1,  1, -1));
Vector4 topRightCorner   = invViewProj.MultiplyPoint(new Vector3( 1,  1, -1));
Vector4 bottomLeftCorner = invViewProj.MultiplyPoint(new Vector3(-1, -1, -1));
// pass to shader
mPassMaterial.SetVector(CameraTopLeftCornerID, topLeftCorner);
mPassMaterial.SetVector(CameraXExtentID, topRightCorner - topLeftCorner);
mPassMaterial.SetVector(CameraYExtentID, bottomLeftCorner - topLeftCorner);
```

在Shader中，我们利用以上信息还原出世界空间坐标：

```glsl
float3 ReconstructionPositionWS(float2 uv)
{
    float rawDepth = SampleSceneDepth(uv);
    float linearDepth = LinearEyeDepth(rawDepth, _ZBufferParams);

    uv.y = 1.0 - uv.y;
    float zScale = linearDepth * rcp(_ProjectionParams.y);
    float3 positionVS = _CameraTopLeftCorner.xyz +
                        _CameraXExtent.xyz * uv.x +
                        _CameraYExtent.xyz * uv.y;
    positionVS *= zScale;

    return _WorldSpaceCameraPos + positionVS;
}
```

---

