package com.collego.repository;

import com.collego.entity.CourseMaterial;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface CourseMaterialRepository extends JpaRepository<CourseMaterial, Long> {
    List<CourseMaterial> findBySectionIdOrderByCreatedAtDesc(Long sectionId);
    List<CourseMaterial> findBySectionIdAndMaterialType(Long sectionId, String materialType);
}
