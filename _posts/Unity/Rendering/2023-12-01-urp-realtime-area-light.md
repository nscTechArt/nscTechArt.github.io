---
title: URP中实现实时面光源
date: 2023-12-01 09:40 +0800
categories: [Unity, Rendering]
media_subpath: /assets/img/23-12-01/
tag: [Unity, AreaLight]
math: true
---
### Motivation

Cozy Space是一个装修模拟类游戏。它具有以下特点：

- 灵活的房间户型设计：玩家可以构建任意的多边形房间
- 时间/天气系统：玩家可以修改游戏中的时间段与天气，从而影响房间内的光照与氛围
- 自由的家具摆放：玩家可以自由地摆放房间中的家具、装饰品

基于以下几点考虑，我最终选择使用实时面光源作为房间中的主要光照来源：

- 平行光不适合作为封闭室内的照明来源，而更适合配合窗户和窗帘，营造室内氛围
- 由于房间户型是相对任意的，对于较为复杂的房间（例如一个1x6的走廊），点光源和聚光灯无法提供较好的照明效果
- 游戏中的所有家具都是可以自由拖放的，不存在静态对象，意味着不能使用lightmap等技术
- 基于LTC的实时面光源技术能够配合PBR材质着色，与项目美术资产不冲突，能够实现高质量的室内照明

### LTC Area Light的理论基础

对于面光源来说，我们需要在面光源的quad范围内对BRDF进行积分，但是我们会面临两个问题：

[Real-Time Polygonal-Light Shading with Linearly Transformed Cosines](https://www.youtube.com/watch?v=ZLRgEN7AQgM&t=3s)

[LTC.pdf - Google Drive](https://drive.google.com/file/d/0BzvWIdpUpRx_d09ndGVjNVJzZjA/view?resourcekey=0-21tmiqk55JIZU8UoeJatXQ)

1. 在球面上



![](areaLightBounds.png)
