---
title: Physically Based Shading at Disney
date: 2023-06-18 14:57 +0800
categories: [Graphics, Physical Based Rendering]
media_subpath: /assets/img/Graphics/pbr/
math: true
---

> 本篇博客会首先翻译[Physically Based Shading at Disney](https://media.disneyanimation.com/uploads/production/publication_asset/48/asset/s2012_pbs_disney_brdf_notes_v3.pdf)的主要内容，并给出相应的实现代码

### Read PDF

#### 1 The Microfacet Model

各向同性材质的微表面模型的通用形式如下：


$$
f(l, v)=\text{diffuse}+\frac{D(h_\theta)F(\theta_h)G(\theta_l, \theta_v)}{4cos\theta_l cos\theta_v}
$$


其中，$\text{diffuse}$项有多种形式，通常会使用Lambertian模型并以常数表示。而对于镜面反射项：

- D表示微表面的分布函数，决定specular peak的形状
- G表示几何衰减
- F表示菲涅尔反射系数

$\theta_l$与$\theta_v$分别表示入射光线与观察方向相对于法线的夹角，$\theta_h$则表示半程向量与法线的夹角。$\theta_d$表示观察方向与半程向量之间的夹角。

#### 2 Disney "Principled" BRDF

##### 2.1 Principles

- 采用直观参数而非物理量参数
- 参数数量最小化
- 参数合理范围限定在$[0, 1]$区间
- 允许在特定场景下突破合理范围限制
- 所有参数组合需保证稳定合理的输出

##### 2.2 Parameters

- **baseColor**：表面颜色，通常有纹理贴图提供
- **subsurface**：使用此表面近似来控制漫反射形状
- **metallic**：金属度，用于再两个不同模型之前做线性插值。金属材质模型不包含漫反射分量，其镜面反射的入射着色与基础色相同
- **specular**：入射镜面反射量，该参数用于替代显式IOR定义
- **specularTint**：使入射镜面反射趋向基础色着色，掠射镜面仍保持无色
- **roughness**：表面粗糙度，同时影响漫反射与镜面反射
- **anisotropic**：各向异性强度，0=各向同性，1=最大各向异性
- **sheen**：附加掠射反射分量，专为布料材质设计
- **sheenTint**：布料光泽趋向基础色的着色强度
- **clearcoat**：第二层特殊用途的镜面反射波瓣
- **clearcoatGloss**：控制清漆层光泽度（0=缎面质感，1=镜面质感）

##### 2.3 Diffuse Model Details

Lambert漫反射模型**在边缘区域常显过暗**，加入菲涅尔因子提升物理合理性后**反而加剧暗部问题**。基于此，我们开发了新型经验式**漫反射逆向反射模型**，该模型实现了**平滑表面的漫反射菲涅尔阴影**与**粗糙表面附加高光**之间的自然过渡。其物理机制可解释为：**粗糙表面光线在微结构侧边发生进出折射，导致掠射角透射率提升**。该模型既延续了特设模型的艺术可控性，又具备更合理的物理基础。

在这个模型中，我们忽略了漫反射菲涅尔因子的IOR，并且假设不存在入射漫反射的能量损失。此外。本模型还使用Schlick菲涅尔近似，并将将掠射逆向反射终点值绑定粗糙度参数（而非归零）。数学表达式如下：


$$
f_d=\frac{baseColor}{\pi}(1+(F_{D90}-1)(1-cos\theta_l)^5)(1+(F_{D90}-1)(1-cos\theta_v)^5)
$$


其中，


$$
F_{D90}=0.5+2*roughness*cos^2\theta_d
$$


