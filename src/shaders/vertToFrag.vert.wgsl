@group(0) @binding(1) var<uniform> modelMatrix:mat4x4<f32>;

struct VertexOutput {
    @builtin(position) Position : vec4<f32>,
    @location(0) color: vec4<f32>
};

@vertex
fn main(
  @location(0) position : vec4<f32>,
  @location(1) color : vec4<f32>
) ->VertexOutput{
  var output : VertexOutput;
  output.Position =modelMatrix*position;
  output.color = color;
  return output;
}