@group(0) @binding(1) var<uniform> modelMatrix:mat4x4<f32>;

@vertex
fn main(@location(0) position : vec3<f32>) -> @builtin(position) vec4<f32> {
  return modelMatrix*vec4<f32>(position, 1.0);
}