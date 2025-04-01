---
title: Blender中的一键AABB生成插件
date: 2023-05-08 09:40 +0800
categories: [Blender, Tools]
media_subpath: /assets/img/Blender/Tools
tag: [Blender]
image: 111111.png
---

### 1 Motivation

[Cozy Space](https://store.steampowered.com/app/2524480/Cozy_Space/)的中的所有家具都允许玩家进行自由的摆放，而“点击”、“选中”、“拖动”这些操作依赖于Unity中射线与家具碰撞体检测实现的。这个功能不需要过于负责的碰撞体，AABB就能胜任。此外，[Cozy Space](https://store.steampowered.com/app/2524480/Cozy_Space/)中的家具模型都是在Blender中创建的，所以我就写了这个简单的插件，以便于美术同事能够快速地为创建好的家具模型添加AABB并导出。

---

### 2 实现过程

#### 2.1 需求

这个插件的具体需求为：

- **基于选中物体**的世界空间包围盒
- **自动命名**：继承原物体名称（如Cube）并追加可自定义后缀（默认为"_Col"）
- **自动定位**在包围盒中心点
- **设置父级**：将包围盒设为原物体的子物体

此外，为了便于确认AABB的生成效果，创建出来的AABB网格体默认**使用线框显示**。

#### 2.2 思路

1. **包围盒计算**：
   - **坐标转换**：通过物体的 `matrix_world` 将本地包围盒坐标转为世界坐标
   - **极值计算**：根据8个顶点坐标，分别取X/Y/Z轴的最小/最大值得到`min_coord`和`max_coord`
2. **几何体创建**：
   - 使用Bmesh创建单位立方体
   - 应用父级逆矩阵`matrix.inverted()`，使包围盒与父级坐标系对齐
   - 通过`dimensions`属性直接设置包围盒尺寸，避免缩放系数的干扰
3. **父子关系绑定**：
   - 通过`aabb_obj.parent = obj`建立层次关系
   - `matrix_parent_inverse`确保子级物体的坐标系与父级正确对应

#### 2.3 Code

```python
bl_info = {
    "name": "AABB Generator",
    "author": "nscTechArt",
    "version": (1, 0),
    "blender": (4, 2, 0),
    "location": "3D视图 > 侧边栏 > 工具",
    "description": "支持自定义后缀的碰撞盒生成器",
    "warning": "",
    "category": "Object",
}

import bpy
import bmesh
from mathutils import Vector

class OBJECT_OT_CreateAABB(bpy.types.Operator):
    """生成可自定义后缀的碰撞盒"""
    bl_idname = "object.create_aabb"
    bl_label = "生成AABB"
    bl_options = {'REGISTER', 'UNDO'}

    suffix: bpy.props.StringProperty(name="后缀",description="碰撞盒命名后缀",default="_Col",maxlen=32) # type: ignore

    def execute(self, context):
        obj = context.active_object
        if not obj:
            self.report({'ERROR'}, "未选择任何物体")
            return {'CANCELLED'}
        
        try:
            # calculate AABB
            # --------------
            matrix = obj.matrix_world
            local_coords = obj.bound_box
            world_coords = [matrix @ Vector(coord) for coord in local_coords]

            min_coord = Vector((
                min(v.x for v in world_coords), 
                min(v.y for v in world_coords),
                min(v.z for v in world_coords)))
                
            max_coord = Vector((
                max(v.x for v in world_coords), 
                max(v.y for v in world_coords),
                max(v.z for v in world_coords)))

            # generate suffix names
            # ---------------------
            base_name = obj.name.split('.')[0]
            collision_name = f"{base_name}{self.suffix}"

            # create AABB object 
            # ------------------
            bm = bmesh.new()
            bmesh.ops.create_cube(bm, size=1)
            bm.transform(matrix.inverted())
            
            aabb_mesh = bpy.data.meshes.new(f"{collision_name}_Mesh")
            bm.to_mesh(aabb_mesh)
            bm.free()
            
            aabb_obj = bpy.data.objects.new(collision_name, aabb_mesh)
            aabb_obj.location = (min_coord + max_coord) / 2
            aabb_obj.dimensions = max_coord - min_coord
            
            # setup display properties
            # ------------------------
            aabb_obj.display_type = 'WIRE'
            aabb_obj.show_wire = True
            aabb_obj.show_all_edges = True
            
            # bind the AABB to the original object
            # ------------------------------------
            aabb_obj.parent = obj
            aabb_obj.matrix_parent_inverse = matrix.inverted()

            context.collection.objects.link(aabb_obj)
            return {'FINISHED'}
            
        except Exception as e:
            self.report({'ERROR'}, str(e))
            return {'CANCELLED'}

class VIEW3D_PT_AABBPanel(bpy.types.Panel):
    """自定义碰撞盒生成界面"""
    bl_label = "AABB生成器"
    bl_space_type = 'VIEW_3D'
    bl_region_type = 'UI'
    bl_category = "工具"

    def draw(self, context):
        layout = self.layout
        operator = layout.operator("object.create_aabb")
        
        # 后缀输入框
        row = layout.row()
        row.prop(operator, "suffix", text="后缀")
        
        # 示例说明
        box = layout.box()
        box.label(text="命名示例：", icon='INFO')
        box.label(text="物体: 'Cube' → 生成: 'Cube_Col'")
        box.label(text="支持使用特殊后缀：'_HitBox', '_Collider'等")

def register():
    bpy.utils.register_class(OBJECT_OT_CreateAABB)
    bpy.utils.register_class(VIEW3D_PT_AABBPanel)

def unregister():
    bpy.utils.unregister_class(OBJECT_OT_CreateAABB)
    bpy.utils.unregister_class(VIEW3D_PT_AABBPanel)

if __name__ == "__main__":
    register()
```

---

### 3 More

目前我对Blender中的Python开发还不是很熟悉，希望以后有机会回头再来优化这个小插件。

现在能想到的优化方向有：

- [ ] 支持多个选中物体
