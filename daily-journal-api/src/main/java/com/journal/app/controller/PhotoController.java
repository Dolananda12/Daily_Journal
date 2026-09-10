package com.journal.app.controller;

import com.journal.app.entity.Photo;
import com.journal.app.repository.PhotoRepository;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/photos")
@CrossOrigin(origins = "${app.cors-allowed-origins}")
public class PhotoController {

    private final PhotoRepository photoRepository;

    public PhotoController(PhotoRepository photoRepository) {
        this.photoRepository = photoRepository;
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> uploadPhoto(@RequestParam("file") MultipartFile file) {
        try {
            Photo photo = new Photo();
            photo.setFileName(file.getOriginalFilename());
            photo.setContentType(file.getContentType());
            photo.setData(file.getBytes());
            Photo saved = photoRepository.save(photo);
            return ResponseEntity.ok(Map.of("id", saved.getId().toString()));
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping
    public List<Map<String, String>> listPhotos() {
        return photoRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(p -> Map.of(
                        "id", p.getId().toString(),
                        "fileName", p.getFileName(),
                        "contentType", p.getContentType()
                ))
                .collect(Collectors.toList());
    }

    @GetMapping("/{id}")
    public ResponseEntity<byte[]> getPhoto(@PathVariable UUID id) {
        return photoRepository.findById(id).map(photo -> {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.parseMediaType(photo.getContentType()));
            return new ResponseEntity<>(photo.getData(), headers, HttpStatus.OK);
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePhoto(@PathVariable UUID id) {
        if (photoRepository.existsById(id)) {
            photoRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }
}
