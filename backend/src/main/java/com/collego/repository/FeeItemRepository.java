package com.collego.repository;

import com.collego.entity.FeeItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface FeeItemRepository extends JpaRepository<FeeItem, Long> {
    List<FeeItem> findByFeeId(Long feeId);
}
