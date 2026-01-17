---
title: 虚幻引擎程序设计浅析-第四章-对象
date: 2025-07-07 22:40 +0800
categories: [Engine, 虚幻引擎程序设计浅析]
media_subpath: /assets/img/Engine/book-B09PHK6W6P
math: false

---

### 4.0 UE类命名规则

常用的前缀如下：

- **F**：纯C++类

- **U**：继承自`UObject`，但不继承自`Actor`

- **A**：继承自`Actor`

- **S**：Slate控件相关类

- **H**：HitResult相关类

---

### 4.1 类对象的产生

在标准的C++开发中，我们通过`new`关键字，从类中创建一个对象，这个过程叫做实例化。

而在UE中，实例化的方式则因类型而异：

- 纯C++类：可以通过`new`关键字

- 继承自`UObject`类但不继承自`Actor`类：通过`NewObject`函数来创建对象

- 继承自`Actor`类：通过`SpawnActor`函数创建对象

---

### 4.2 类对象的获取

在UE中，获取一个类对象的唯一方法：**通过某种方式传递到这个对象的指针或引用**。

但也有一个特殊情况，即如何获取场景中某种Actor的所有实例？答案是借助Actor迭代器：`TActorIterator`：

```C++
for(TActorIterator<AActor> Iterator(GetWorld()); Iterator; Iterator++
{
    ... // do something 
}
```

其中`TActorITerator`的泛型参数可以不是`Actor`。

通过迭代器，我们可以通过`*Iterator`来获取对象，或者通过`Iterator->YourFunction()`来调用成员函数。

---

### 4.3 类对象的销毁

类的销毁方式同样因类型而异。

#### 4.3.1 纯C++类

如果在函数体中创建了一个纯C++类，并且不是通过`new`关键字创建的，那么该对象会在函数调用结束后，随函数栈空间释放一起释放，例如：

```cpp
void YourFunction()
{
    FYourClass YourObject = FYourClass();
    ... // do something
}
```

如果纯C++类是通过`new`关键字创建的，并且没有使用到智能指针，那么就意味着你必须对该内存进行手动释放。

如果我们使用了智能指针`TSharedPtr`/`TSharedRef`来进行管理`new`关键字创建的纯C++类，那么我们就不需要手动释放了。我们可以通过`MakeShareable`函数将普通指针转换为只能指针：

```cpp
TSharedPtr<YourClass> YourClassPtr = MakeSharebale(new YourClass();
```

对于新手，最好使用智能指针的方案。

#### 4.3.2 `UObject`类

我们在第一章有提到，`UObject`类提供了一个重要功能就是自动垃圾回收机制。

当一个类的成员变量包含指向`UObject`对象，同时又带有`UPROPERTY`宏定义，那么这个成员变量将会触发引用计数机制。

UE的垃圾回收器会定期从根节点开始检查，当一个`UObject`没有被任何`UObject`引用，就会被垃圾回收哦。

#### 4.3.3 `Actor`类

通过调用`Destory`函数销毁