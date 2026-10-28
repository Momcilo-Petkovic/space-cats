package com.gamekit;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

// Runs without a database: the repository is mocked.
class ScoreControllerTest {

    private ScoreRepository repo;
    private MockMvc mvc;

    @BeforeEach
    void setUp() {
        repo = mock(ScoreRepository.class);
        mvc = MockMvcBuilders.standaloneSetup(new ScoreController(repo)).build();
    }

    @Test
    void savesValidScore() throws Exception {
        mvc.perform(post("/api/game/score").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\"Hero\",\"score\":12500,\"level\":3}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("success"));
        verify(repo).save(any(Score.class));
    }

    @Test
    void rejectsBlankName() throws Exception {
        mvc.perform(post("/api/game/score").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"playerName\":\" \",\"score\":10,\"level\":1}"))
                .andExpect(status().isBadRequest());
        verify(repo, never()).save(any());
    }

    @Test
    void returnsTopScores() throws Exception {
        when(repo.findTop10ByOrderByScoreDesc()).thenReturn(List.of(new Score("Hero", 900, 2)));
        mvc.perform(get("/api/game/scores/top"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].playerName").value("Hero"))
                .andExpect(jsonPath("$[0].score").value(900));
    }
}
