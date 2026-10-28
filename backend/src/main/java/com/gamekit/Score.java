package com.gamekit;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "scores")
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "player_name", nullable = false, length = 20)
    private String playerName;

    @Column(nullable = false)
    private int score;

    @Column(nullable = false)
    private int level;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();

    protected Score() {
    }

    public Score(String playerName, int score, int level) {
        this.playerName = playerName;
        this.score = score;
        this.level = level;
    }

    public Long getId() { return id; }
    public String getPlayerName() { return playerName; }
    public int getScore() { return score; }
    public int getLevel() { return level; }
    public LocalDateTime getCreatedAt() { return createdAt; }
}
