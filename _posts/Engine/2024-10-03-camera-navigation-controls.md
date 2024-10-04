---
title: 实现TraceBall模式的相机系统
date: 2024-10-03 10:00 +0800
categories: [Engine, Evnia Engine Developing]
media_subpath: /assets/img/Engine/evnia/
math: false
---

我们将参考Blender，基于OpenGL实现类似的相机模型，它包含以下三种类型的运动方式

- **Track**：上下左右移动的能力
- **Dolly**：控制相机远离或靠近物体，需要与变焦相区分
- **Tumble(Rotate)**：在一个以物体为中心的虚拟球体上运行，以实现环绕物体运动的效果

这三种运动方式在Blender中的触发条件分别是：

- **Track**：`shift` + 鼠标中键
- **Dolly**：鼠标滚轮
- **Tumble(Rotate)**：鼠标中键

我们可以将实现过程分为三个步骤：

1. 识别相机运动状态的触发条件
2. 根据鼠标位置的差值来应用所需效果

---

### 步骤1：识别相机运动状态的触发条件



---

### 步骤2：实现三种运动效果
