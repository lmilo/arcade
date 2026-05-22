import tkinter as tk
import heapq
from games.base_game import BaseGame
from utils.theme import THEME

class Pathfinding(BaseGame):
    def __init__(self, parent):
        self.grid = [[0]*15 for _ in range(15)]
        self.start = (2, 2)
        self.end = (12, 12)
        super().__init__(parent, title="🛰️ Pathfinding Visualizer", width=500, height=600)

    def get_tutorial_text(self):
        return "Haz clic para poner paredes. 'Visualizar' para encontrar el camino óptimo."

    def _build_ui(self):
        self.canvas = tk.Canvas(self, width=450, height=450, bg="#111")
        self.canvas.pack(pady=10)
        self.canvas.bind("<B1-Motion>", self._add_wall)
        self.canvas.bind("<Button-1>", self._add_wall)
        
        btn_frame = tk.Frame(self, bg=THEME["bg"])
        btn_frame.pack()
        tk.Button(btn_frame, text="🚀 Visualizar A*", command=self._run_astar).pack(side="left", padx=10)
        tk.Button(btn_frame, text="🔄 Limpiar", command=self.reset).pack(side="left", padx=10)
        self._draw()

    def _add_wall(self, event):
        x, y = event.x//30, event.y//30
        if 0<=x<15 and 0<=y<15 and (x, y) != self.start and (x, y) != self.end:
            self.grid[y][x] = 1
            self._draw()

    def _run_astar(self):
        queue = [(0, self.start)]
        came_from = {self.start: None}
        cost_so_far = {self.start: 0}
        
        while queue:
            current = heapq.heappop(queue)[1]
            if current == self.end: break
            
            for dx, dy in [(0,1),(0,-1),(1,0),(-1,0)]:
                next_node = (current[0]+dx, current[1]+dy)
                if 0<=next_node[0]<15 and 0<=next_node[1]<15 and self.grid[next_node[1]][next_node[0]] == 0:
                    new_cost = cost_so_far[current] + 1
                    if next_node not in cost_so_far or new_cost < cost_so_far[next_node]:
                        cost_so_far[next_node] = new_cost
                        priority = new_cost + abs(next_node[0]-self.end[0]) + abs(next_node[1]-self.end[1])
                        heapq.heappush(queue, (priority, next_node))
                        came_from[next_node] = current
        
        # Path
        curr = self.end
        while curr in came_from and came_from[curr]:
            self.grid[curr[1]][curr[0]] = 2 # Path
            curr = came_from[curr]
        self._draw()

    def _draw(self):
        self.canvas.delete("all")
        s = 30
        for r in range(15):
            for c in range(15):
                color = "#222"
                if (c, r) == self.start: color = "green"
                elif (c, r) == self.end: color = "red"
                elif self.grid[r][c] == 1: color = "gray"
                elif self.grid[r][c] == 2: color = "yellow"
                self.canvas.create_rectangle(c*s, r*s, c*s+s, r*s+s, fill=color, outline="#333")

    def reset(self):
        self.grid = [[0]*15 for _ in range(15)]
        self._draw()
