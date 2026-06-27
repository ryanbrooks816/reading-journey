export const FLOW_GRID: [number, number] = [32, 32];

export function snapFlowPosition(position: { x: number; y: number }) {
    return {
        x: Math.round(position.x / FLOW_GRID[0]) * FLOW_GRID[0],
        y: Math.round(position.y / FLOW_GRID[1]) * FLOW_GRID[1],
    };
}
