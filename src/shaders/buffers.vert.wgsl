@group(0) @binding(1) var<uniform> modelMatrix:mat4x4<f32>;

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) fragUV : vec2<f32>,
    @location(1) fragPosition: vec4<f32>
};

@vertex
fn main(
  @location(0) position : vec3<f32>,
  @location(1) color : vec3<f32>
) -> @builtin(position) vec4<f32> {
  return modelMatrix*vec4<f32>(position, 1.0);
}