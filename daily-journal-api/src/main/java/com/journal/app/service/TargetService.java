package com.journal.app.service;

import com.journal.app.dto.TargetKeyResponse;
import com.journal.app.dto.TargetRequest;
import com.journal.app.dto.TargetResponse;
import com.journal.app.entity.Target;
import com.journal.app.repository.TargetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
@Transactional(readOnly = true)
public class TargetService {

    private final TargetRepository targetRepository;

    public TargetService(TargetRepository targetRepository) {
        this.targetRepository = targetRepository;
    }

    /**
     * Get a single target by (type, key).
     * Returns an empty TargetResponse (not null) when no row exists,
     * matching the frontend expectation: `data ?? { target_type, target_key, items: [] }`.
     * GET /api/targets?type=&key=
     */
    public TargetResponse get(String type, String key) {
        return targetRepository
                .findByTargetTypeAndTargetKey(type, key)
                .map(TargetResponse::from)
                .orElse(TargetResponse.empty(type, key));
    }

    /**
     * Create or update a target (upsert semantics).
     * PUT /api/targets?type=&key=
     */
    @Transactional
    public TargetResponse upsert(String type, String key, TargetRequest request) {
        Target target = targetRepository
                .findByTargetTypeAndTargetKey(type, key)
                .orElse(new Target());

        target.setTargetType(type);
        target.setTargetKey(key);
        target.setItems(request.getItems());
        target.setUpdatedAt(Instant.now());

        Target saved = targetRepository.save(target);
        return TargetResponse.from(saved);
    }

    /**
     * List all keys for a given target type (e.g., all semester names).
     * GET /api/targets/list?type=semester
     */
    public List<TargetKeyResponse> listKeys(String type) {
        return targetRepository.findKeysByType(type).stream()
                .map(row -> new TargetKeyResponse(
                        (String) row[0],
                        row[1] != null ? (Instant) row[1] : Instant.now()))
                .toList();
    }
}
