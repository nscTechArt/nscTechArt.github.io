---
title: Chapter 01 Vector Algebra
date: 2024-08-08 23:45 +0800
categories: [Graphics, Learn DirectX12]
media_subpath: /assets/img/Graphics/LearnDirectX12/
---

### Objectives

1. 了解向量的表示方法
2. 了解向量运算以及对应的几何意义
3. 熟悉DirectXMath库中的向量函数与向量类

### 1.1 Vectors

如果两个向量的方向和长度相等，那么这两个向量就是相等的。

#### 1.1.1 Vectors and Coordinate Systems

由于向量没有位置的概念，我们有必要引入一个三维坐标系，这样有两个好处：

- 便于对向量进行几何意义上的运算
- 能够使用三个数值表示一个向量

在计算机图形学中会使用很多坐标系，所以我们有必要时刻明确当前向量所在的是哪个坐标系。

#### 1.1.2 Left-Handed vs Right-Handed Coordinate Systems

**Direct3D基于左手坐标系。**两种坐标系的区别在于Z轴的方向，如下图所示：

![](20240808180335.png)

#### 1.1.3 Basic Vector Operations

我们定义四种向量的基本运算，以向量$\pmb{u}=(u_x, u_y,u_z)$和向量$\pmb{v}=(v_x, v_y,v_z)$为例

- **相等**
- **相加**
- **数乘**
- **相减**

---

### 1.2 Length and Unit Vectors

向量长度的计算方式就不赘述了。

有些向量我们不关心它们的长度，而只用作表示方向，对于这样的向量，我们希望它们的长度保持为1。设置长度为单位长度的操作被称为归一化，实现方式为向量除以向量的长度。

---

### 1.3 Dot Product

点乘的结果是一个标量值，它有两种计算方法：

1. 各个分量的乘积的合
2. 两个向量的长度相乘，再乘以向量夹角的余弦值

由于点积的几何意义，我们可以通过点积的结果判断两个向量之间的几何关系：

- 结果等于0，则两个相互垂直
- 结果小于0，则夹角大于90度
- 结果大于0，则夹角小于90度

---

### 1.4 Cross Product

 略

---

### 1.5 Point

略

---

### 1.6 DirectX Math Vectors

DirectX数学库使用SSE2 (Steaming SIMD Extension 2)指令集。通过128位宽的SIMD寄存器，我们可以使用一个指令操作四个32-bit的`float`或`int`。

使用DirectXMath库，需要`#include <DirectXMath.h>`。对于额外的数据类型来说，还需要`#include <DirectXPackedVector.h>`。

我的设置基于x64，默认支持SSE2，所以无需额外设置。

还需要启用快速浮点模式。

#### 1.6.1 Vector Types

在数学库中，向量的核心类型是`XMVECTOR`。之所以说是核心，是因为**在进行向量运算时，向量的类型通常需要是 `XMVECTOR`**。 `XMVECTOR` 类型是专门设计来与 SIMD 指令集一起使用的。这种类型的向量在内存中是 128 位对齐的，并且包含四个 32 位浮点数，这正好符合 SIMD 指令处理 4 个浮点数的要求。

对于局部或全局的向量变量，我们可以直接使用`VMVECTOR`。而对于class的数据成员，我们应该对应地使用`XMFLOATn`。`XMFLOATn`是一个结构体，其定义如下（以`XMFLOAT3`为例）：

```c++
struct XMFLOAT3
{
    float x;
    float y;
    float z;

    XMFLOAT3() = default;

    XMFLOAT3(const XMFLOAT3&) = default;
    XMFLOAT3& operator=(const XMFLOAT3&) = default;

    XMFLOAT3(XMFLOAT3&&) = default;
    XMFLOAT3& operator=(XMFLOAT3&&) = default;

    constexpr XMFLOAT3(float _x, float _y, float _z) noexcept : x(_x), y(_y), z(_z) {}
    explicit XMFLOAT3(_In_reads_(3) const float* pArray) noexcept : x(pArray[0]), y(pArray[1]), z(pArray[2]) {}
};
```

如代码所示，**`XMFLOATn`本质上只是封装了C++基础数据类型`float`，与SIMD指令无关。**

所以，当我们进行向量运算时，我们首先需要使用数学库中的loading function将`XMFLOATn`转换为`XMVECTOR`。反之，我们同样可以使用store函数将`XMVECTOR`转换为`VMFLOATn`。

这里总结一下我对于XMFLOATs和XMVECRTOR的了解：

- **`XMVECTOR` 利用SIMD执行高效的向量运算**
- **`XMFLOATn`用于存储和传递数据。**

#### 1.6.2 Loading and Storage Methods

以`XMFLOAT3`为例，用于将`XMFLOATn`转换为`XMVECTOR`的函数原型为：

```c++
// load XMFLOAT3 into XMVECTOR
VMVECTOR XM_CALLCONV XMLoadFloat3(const XMFLOAT3* pSource);
```

其中`XM_CALLCONV`用于指定调用约定（calling convertion），即函数调用时参数应该如何传递和返回。

下面是一个例子：

```c++
XMFLOAT3 float3 = {1.0f, 1.0f, 1.0f};
XMVECTOR vector = XMLoadFloat3(&float3);
```

我们也可以通过函数`XMStoreFloat3`将一个`XMVECTOR`中的数据保存早`XMFLOAT3`中：

```c++
XMVECTOR vector = XMVectorSet(1.0f, 1.0f, 1.0f, 1.0f);
XMFLOAT3 float3;
XMStoreFloat3(&float3, vector);
```

某些情况下，我们想要单独设置或存储某个XMVECTOR中某个分量的值，我们可以使用下面的函数：

```c++
XMVECTOR vector = XMVectorSet(1.0f, 1.0f, 1.0f, 1.0f);
std::cout << XMVectorGetX(vector) << '\n';
vector = XMVectorSetX(vector, 2.0f);
std::cout << XMVectorGetX(vector);
```

需要注意的是，函数`XMVectorSetX`的`XMVECTOR`是按值传递而非按引用传递的，函数会返回修改后的新的`XMVECTOR`。

#### 1.6.3 Parameter Passing

在处理 `XMVECTOR` 值时，为了提高效率，可以通过 SSE/SSE2 寄存器直接传递它们，而不是通过栈来传递。通过这种方式，函数调用的速度会更快，因为减少了将数据存放到栈中和从栈中读取的开销。

但是通过寄存器传递的参数数量可能因平台或编译器而异。所以，基于这种考量，也为了是SIMD向量在函数调用中能够尽可能地通过寄存器传递，减少栈传递的开销，DirectX数学库引入了多种特殊的向量类型，下面是我们要遵循的传递`VMVECTOR`参数规则：

1. 前三个`VMVECTOR`参数使用类型`FVMVECTOR`，表示通过寄存器传递
2. 第四个`VMVECTOR`参数使用类型`GVMVECTOR`
3. 第五个和第六个`VMVECTOR`参数使用`HVMVECTOR`
4. 任何其余的`VMVECTOR`参数使用`CVMVECTOR`

下面是数学库中的XMMatrixTransformation的函数原型，我们可以将其作为一个例子：

```c++
inline XMMATRIX XM_CALLCONV XMMatrixTransformation(
    FXMVECTOR ScalingOrigin, 
    FXMVECTOR ScalingOrientationQuaternion, .
    FXMVECTOR Scaling, 
    GXMVECTOR RotationOrigin, 
    HXMVECTOR RotationQuaternion,
    HXMVECTOR Translation);
```

#### 1.6.4 Constant Vectors

对于常量的`VMVECTOR`实例，我们应该是用`VMVECTORF32`作为类型，例如：

```c++
static const XMVECTORF32 g_vZero = {0.0f, 0.0f, 0.0f, 0.0f};
```

或者，我们可以将`XMVECTORF32`用作XMVECTOR的初始化。

#### 1.6.5 Overloaded Operators

VMVECTOR有一些用于向量加法、向量减法、向量数乘的重载运算符：

```c++
XMVECTOR  XM_CALLCONV   operator+ (FXMVECTOR V);
 XMVECTOR  XM_CALLCONV   operator- (FXMVECTOR V);
 XMVECTOR&  XM_CALLCONV   operator+= (XMVECTOR& V1, FXMVECTOR V2);
 XMVECTOR&  XM_CALLCONV   operator-= (XMVECTOR& V1, FXMVECTOR V2);
 XMVECTOR&  XM_CALLCONV   operator*= (XMVECTOR& V1, FXMVECTOR V2);
 XMVECTOR&  XM_CALLCONV   operator/= (XMVECTOR& V1, FXMVECTOR V2);
 XMVECTOR&  operator*= (XMVECTOR& V, float S);
 XMVECTOR&  operator/= (XMVECTOR& V, float S);
 XMVECTOR  XM_CALLCONV   operator+ (FXMVECTOR V1, FXMVECTOR V2);
 XMVECTOR  XM_CALLCONV   operator- (FXMVECTOR V1, FXMVECTOR V2);
 XMVECTOR  XM_CALLCONV   operator* (FXMVECTOR V1, FXMVECTOR V2);
 XMVECTOR  XM_CALLCONV   operator/ (FXMVECTOR V1, FXMVECTOR V2);
 XMVECTOR  XM_CALLCONV   operator* (FXMVECTOR V, float S);
 XMVECTOR  XM_CALLCONV   operator* (float S, FXMVECTOR V);
 XMVECTOR  XM_CALLCONV   operator/ (FXMVECTOR V, float S);
```

#### 1.6.6 Miscellaneous

数学库定义了一下常用的常量

```c++
const float XM_PI       = 3.141592654f;
const float XM_2PI      = 6.283185307f;
const float XM_1DIVPI   = 0.318309886f;
const float XM_1DIV2PI  = 0.159154943f;
const float XM_PIDIV2   = 1.570796327f;
const float XM_PIDIV4   = 0.785398163f;
```

用于角度的弧度相互转换的函数：

```c++
inline float XMConvertToRadians(float fDegrees) 
{ return fDegrees * (XM_PI / 180.0f); }

inline float XMConvertToDegrees(float fRadians) 
{ return fRadians * (180.0f / XM_PI); 
```

取最大值与最小值的函数：

```c++
 template<class T> inline T XMMin(T a, T b) { return (a < b) ? a : b; }
 template<class T> inline T XMMax(T a, T b) { return (a > b) ? a : b; }
```

#### 1.6.7 Setter Function

数学库提供了一些函数用于为XMVECTOR设置值:

```c++
 // Returns the zero vector 0
 XMVECTOR XM_CALLCONV XMVectorZero();
 // Returns the vector (1, 1, 1, 1)
 XMVECTOR XM_CALLCONV XMVectorSplatOne();
 // Returns the vector (x, y, z, w)
 XMVECTOR XM_CALLCONV XMVectorSet(float x, float y, float z, float w);
 // Returns the vector (s, s, s, s)
 XMVECTOR XM_CALLCONV XMVectorReplicate(float Value);
 // Returns the vector (vx, vx, vx, vx) 
XMVECTOR XM_CALLCONV XMVectorSplatX(FXMVECTOR V);
 // Returns the vector (vy, vy, vy, vy) 
XMVECTOR XM_CALLCONV XMVectorSplatY(FXMVECTOR V);
 // Returns the vector (vz, vz, vz, vz) 
XMVECTOR XM_CALLCONV XMVectorSplatZ(FXMVECTOR V);
```

#### 1.6.8 Vector Functions

数学库实现了XMVECTOR的向量运算，我们可以在[**这篇链接**](https://learn.microsoft.com/en-us/windows/win32/dxmath/ovw-xnamath-reference-functions-vector3)中查阅。

需要注意的是，有些运算结果即使是一个标量，函数也会返回`XMVECTOR`类型，其中`XMVECTOR`所有分量都是运算结果的值。

---

