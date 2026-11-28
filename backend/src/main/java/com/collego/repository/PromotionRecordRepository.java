package com.collego.repository;

import com.collego.entity.PromotionRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PromotionRecordRepository extends JpaRepository<PromotionRecord, Long> {
    List<PromotionRecord> findByBatchIdOrderByStudentId(Long batchId);
}
