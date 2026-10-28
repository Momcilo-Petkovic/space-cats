package com.gamekit;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/game")
public class ScoreController {

    private final ScoreRepository scores;

    public ScoreController(ScoreRepository scores) {
        this.scores = scores;
    }

    public record ScoreRequest(String playerName, int score, int level) {
    }

    @PostMapping("/score")
    public ResponseEntity<Map<String, String>> save(@RequestBody ScoreRequest req) {
        String name = req.playerName() == null ? "" : req.playerName().trim();
        if (name.isEmpty() || name.length() > 20 || req.score() < 0 || req.level() < 1 || req.level() > 50) {
            return ResponseEntity.badRequest().body(Map.of("status", "error", "message", "Invalid score"));
        }
        scores.save(new Score(name, req.score(), req.level()));
        return ResponseEntity.ok(Map.of("status", "success"));
    }

    @GetMapping("/scores/top")
    public List<Score> top() {
        return scores.findTop10ByOrderByScoreDesc();
    }
}
