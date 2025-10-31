# Printer-Filament Integration: Comprehensive Implementation Plan

## 📋 7-Question Methodology Analysis

### 1. What Problem Are We Solving?

**Problem Statement:** Users currently manage filament inventory manually. When a print job
completes, they must:

- Manually track which filament was used
- Calculate/estimate filament consumption
- Update inventory remaining weights
- Track usage history separately
- Risk errors from forgetting to update inventory

**Impact:**

- Time-consuming manual tracking
- Error-prone inventory management
- Inaccurate cost calculations
- Poor analytics (can't easily see consumption patterns)
- Difficulty predicting when to reorder

**Solution:** Automatically update filament inventory when print jobs complete by:

- Extracting filament consumption from MQTT data
- Matching print jobs to active filaments (via AMS slot)
- Automatically deducting used filament weight
- Creating usage history records
- Updating filament status (empty/low/active) automatically

---

### 2. Who Are The Stakeholders/Users?

**Primary Users:**

- **3D Printing Enthusiasts** - Want accurate inventory without manual tracking
- **Small Print Shops** - Need cost tracking and inventory management
- **Makers with Multiple Printers** - Manage inventory across devices
- **Enterprise Users** - Require analytics and usage reports

**User Stories:**

1. As a user, I want my filament inventory to update automatically when prints complete
2. As a user, I want to see which filament was used for each print job
3. As a user, I want accurate cost calculations per print
4. As a user, I want low inventory alerts before starting a print
5. As a user, I want usage history and analytics

**Success Criteria:**

- Zero manual inventory updates required for completed prints
- 100% accuracy in filament tracking (within MQTT data limitations)
- Real-time inventory status updates
- Complete usage history for analytics

---

### 3. What Are The Constraints?

**Technical Constraints:**

- ✅ MQTT data must include filament consumption information
- ⚠️ Bambu Labs H2D MQTT format may vary
- ✅ Database schema ready (`filamentUsage` table exists)
- ✅ Current filament inventory system operational
- ⚠️ Need to handle edge cases (partial prints, failures, cancellations)

**Business Constraints:**

- Must maintain backward compatibility with existing inventory
- Cannot break existing filament management features
- Must handle users without AMS systems
- Performance: Updates should not slow down MQTT processing

**Security Constraints:**

- All updates must be user-scoped (OWASP)
- Audit logging required for inventory changes
- Input validation on all consumption data
- Prevent negative inventory weights

**Compliance Constraints:**

- GDPR: Usage data must be user-deletable
- Audit trail for all automatic updates
- Error handling must not expose sensitive data

---

### 4. What Are The Requirements?

#### Functional Requirements (FR)

**FR1: Filament Consumption Extraction**

- Extract actual filament used from MQTT print completion messages
- Handle both successful and failed print jobs
- Calculate partial usage for cancelled prints
- Support multi-color prints (track all filaments used)

**FR2: Automatic Inventory Updates**

- Deduct filament weight automatically on print completion
- Update `remainingWeight` in database
- Update filament `status` based on remaining weight
- Handle grouped spools (deduct from most-used spool)

**FR3: AMS Slot Matching**

- Match active AMS slot from MQTT to filament inventory
- Support manual filament assignment to AMS slots
- Handle slot changes during prints
- Warn if filament not found in inventory

**FR4: Usage History Tracking**

- Create `filamentUsage` record for each print job
- Link usage to print job ID
- Store weight used, date, and notes
- Support manual usage entries for non-tracked prints

**FR5: Error Handling**

- Handle missing filament data gracefully
- Support manual correction of auto-deductions
- Log all automatic updates for audit
- Provide rollback capability for incorrect deductions

#### Non-Functional Requirements (NFR)

**NFR1: Performance**

- Inventory updates must complete in < 500ms
- Must not block MQTT message processing
- Async processing for bulk updates

**NFR2: Reliability**

- 99.9% success rate for automatic updates
- Retry logic for failed database updates
- Transaction rollback on errors

**NFR3: Usability**

- Silent background updates (no UI interruptions)
- Toast notifications for significant status changes (low/empty)
- Clear visual indicators for auto-tracked prints

**NFR4: Security**

- All updates must verify user ownership
- Input validation on all consumption values
- Rate limiting on manual corrections
- Audit logging for all changes

---

### 5. What Is The Current State?

**Existing Infrastructure: ✅**

- ✅ Database schema: `filamentUsage` table with proper relationships
- ✅ MQTT service: Receiving live data from printers
- ✅ Print job tracking: `printJobs` table linked to filaments
- ✅ Filament inventory: Full CRUD operations working
- ✅ Batch update logic: Can update multiple spools
- ✅ Status management: Auto-updates based on weight

**Existing Data Flow:**

```
MQTT → mqttService → liveDataService → Database
                    ↓
              Print Status Updates
```

**Current MQTT Data Available:**

- ✅ Print progress (percentage, layers)
- ✅ Print status (printing, completed, failed, paused)
- ✅ Temperature data (nozzle, bed, chamber)
- ✅ Humidity data (AMS slots)
- ⚠️ **Missing:** Explicit filament consumption values

**Current Filament Management:**

- ✅ Manual inventory entry
- ✅ Edit/delete operations
- ✅ Status tracking (active/low/empty)
- ✅ Purchase price tracking
- ❌ No automatic updates from prints

**Gap Analysis:**

1. **Missing:** Filament consumption extraction from MQTT
2. **Missing:** Print completion event handlers
3. **Missing:** Automatic inventory deduction logic
4. **Missing:** AMS slot to filament matching
5. **Missing:** Usage history auto-population

---

### 6. What Is The Desired State?

**Target Architecture:**

```
MQTT Message (Print Complete)
    ↓
mqttService.parsePrintComplete()
    ↓
Extract Filament Consumption
    ↓
Match AMS Slot to Filament
    ↓
filamentService.recordAutomaticUsage()
    ↓
Update Inventory (deduct weight)
    ↓
Update Status (empty/low/active)
    ↓
Create Usage History Record
    ↓
Notify User (if status changed)
```

**Desired Features:**

**Phase 1: Core Integration** ✅ Foundation

- Print completion detection from MQTT
- Filament consumption extraction
- Basic automatic deduction
- AMS slot matching

**Phase 2: Advanced Tracking** ⚠️ Enhanced

- Multi-color print support
- Partial print handling
- Manual correction interface
- Usage analytics dashboard

**Phase 3: Intelligence** 🚀 Future

- Predictive reordering
- Cost per print calculations
- Material consumption trends
- Optimal usage recommendations

**Success Metrics:**

- 95%+ of completed prints automatically tracked
- <1% manual intervention required
- Zero negative inventory weights
- Real-time inventory accuracy

---

### 7. How Do We Get There?

## 🏗️ Implementation Roadmap

### Phase 1: Foundation (Week 1-2)

#### Step 1.1: MQTT Data Analysis & Extraction

**Objective:** Understand and extract filament consumption from MQTT messages

**Tasks:**

1. **Analyze MQTT Print Completion Messages**

   ```typescript
   // Research required: What data is in print completion messages?
   // - Filament length used?
   // - Filament weight consumed?
   // - AMS slot used?
   // - Print duration?
   ```

2. **Extend MQTT Parser**

   ```typescript
   // server/services/mqttService.ts
   interface H2DPrintCompleteData {
     jobId?: string;
     filename?: string;
     status: 'completed' | 'failed' | 'cancelled';
     filamentUsed?: {
       slot?: number;
       length?: number; // mm
       weight?: number; // grams
       material?: string;
     }[];
     duration?: number; // seconds
     estimatedFilament?: number; // grams
   }
   ```

3. **Create Print Completion Handler**
   ```typescript
   // server/services/printJobService.ts (new service)
   class PrintJobService {
     async handlePrintCompletion(
       printerId: string,
       completionData: H2DPrintCompleteData
     ): Promise<void> {
       // Extract filament consumption
       // Match to active print job
       // Update filament inventory
     }
   }
   ```

**Deliverables:**

- ✅ Documented MQTT print completion message structure
- ✅ Extended `H2DLiveData` interface
- ✅ Print completion detection in mqttService

**Testing:**

- Unit tests for MQTT parsing
- Integration tests with mock MQTT messages
- Verify consumption data extraction

---

#### Step 1.2: AMS Slot Matching System

**Objective:** Match active AMS slots to filament inventory

**Tasks:**

1. **Extend Filament Schema** (if needed)
   - Ensure `amsSlot` field is properly indexed
   - Add `lastUsedDate` field for tracking

2. **Create AMS Matching Logic**

   ```typescript
   // server/services/filamentService.ts
   async findFilamentByAmsSlot(
     userId: string,
     printerId: string,
     amsSlot: number
   ): Promise<Filament | null> {
     // Find active filament in specified AMS slot
     // Verify user ownership
     // Return filament or null
   }
   ```

3. **AMS Slot Assignment UI Enhancement**
   - Add AMS slot selector in filament edit modal
   - Show active AMS slots in inventory view
   - Visual indicator for AMS-tracked filaments

**Deliverables:**

- ✅ AMS slot matching function
- ✅ Enhanced filament edit UI
- ✅ Inventory display showing AMS assignments

**Testing:**

- Test matching logic with various slot configurations
- Verify user scoping (can't see other users' filaments)
- Edge cases: no filament in slot, multiple filaments

---

#### Step 1.3: Automatic Usage Recording

**Objective:** Create service method to record usage automatically

**Tasks:**

1. **Extend FilamentService**

   ```typescript
   // server/services/filamentService.ts
   async recordAutomaticUsage(data: {
     filamentId: string;
     printJobId?: string;
     weightUsed: number;
     userId: string;
     notes?: string;
   }): Promise<FilamentUsage> {
     // 1. Verify filament exists and belongs to user
     // 2. Calculate new remaining weight
     // 3. Update filament record
     // 4. Create filamentUsage record
     // 5. Update filament status
     // 6. Log audit event
   }
   ```

2. **Weight Deduction Logic**

   ```typescript
   // Enterprise-grade: Handle grouped spools
   async deductFilamentWeight(
     filamentId: string,
     weightToDeduct: number
   ): Promise<void> {
     // Get all spools for this product
     // Sort by remaining weight (most used first)
     // Deduct from most-used spool
     // If depleted, move to next spool
     // Update statuses automatically
   }
   ```

3. **Status Auto-Update Logic**
   ```typescript
   private calculateFilamentStatus(
     remainingWeight: number,
     totalWeight: number
   ): 'active' | 'low' | 'empty' | 'stored' {
     if (remainingWeight <= 0) return 'empty';
     if (remainingWeight < 100) return 'low';
     if (remainingWeight < totalWeight * 0.1) return 'low';
     return 'active';
   }
   ```

**Deliverables:**

- ✅ `recordAutomaticUsage()` method
- ✅ Weight deduction with grouped spool support
- ✅ Automatic status calculation
- ✅ Audit logging integration

**Testing:**

- Unit tests for weight deduction
- Test edge cases (negative weights, zero weight, etc.)
- Verify status transitions
- Test grouped spool handling

---

#### Step 1.4: Print Job Integration

**Objective:** Link print completion to filament usage

**Tasks:**

1. **Extend Print Jobs Service**

   ```typescript
   // server/services/printJobService.ts (new file)
   class PrintJobService {
     async handlePrintCompletion(
       printerId: string,
       completionData: H2DPrintCompleteData
     ): Promise<void> {
       // 1. Find active print job for printer
       // 2. Extract filament consumption
       // 3. Match AMS slots to filaments
       // 4. Record usage for each filament
       // 5. Update print job status
     }
   }
   ```

2. **Create Print Completion Event Handler**

   ```typescript
   // server/services/mqttService.ts
   private setupPrintCompletionHandler() {
     this.on('print:completed', async (data) => {
       await printJobService.handlePrintCompletion(
         data.printerId,
         data
       );
     });
   }
   ```

3. **Update Print Job Status**
   - Mark print job as completed
   - Store actual filament used
   - Store actual print duration
   - Link to filament usage records

**Deliverables:**

- ✅ PrintJobService class
- ✅ Print completion event handling
- ✅ Print job status updates

**Testing:**

- Test completion detection
- Verify filament matching
- Test with multiple filaments (multi-color)
- Error handling for missing data

---

### Phase 2: Enhanced Features (Week 3)

#### Step 2.1: Manual Correction Interface

**Objective:** Allow users to correct automatic deductions

**Tasks:**

1. **Backend: Correction API**

   ```typescript
   // server/routes/filaments.ts
   PUT /api/filaments/:id/usage/:usageId/correct
   {
     correctedWeight: number,
     reason: string
   }
   ```

2. **Frontend: Correction UI**
   - Show recent automatic updates
   - Allow editing usage records
   - Require reason for correction
   - Audit trail for all corrections

3. **Rollback Logic**
   ```typescript
   async correctUsage(
     usageId: string,
     correctedWeight: number,
     reason: string
   ): Promise<void> {
     // 1. Get original usage record
     // 2. Calculate difference
     // 3. Rollback original deduction
     // 4. Apply corrected deduction
     // 5. Log correction with reason
   }
   ```

**Deliverables:**

- ✅ Correction API endpoint
- ✅ Usage history UI with edit capability
- ✅ Rollback functionality

---

#### Step 2.2: Multi-Color Print Support

**Objective:** Track all filaments used in single print

**Tasks:**

1. **Extract All AMS Slots Used**

   ```typescript
   // Parse MQTT data for all filament changes during print
   interface MultiColorPrintData {
     filaments: Array<{
       slot: number;
       weightUsed: number;
       material: string;
       color: string;
     }>;
   }
   ```

2. **Batch Usage Recording**
   - Record usage for each filament slot
   - Link all usage records to same print job
   - Calculate total cost (all filaments)

**Deliverables:**

- ✅ Multi-filament tracking
- ✅ Cost calculation per print

---

#### Step 2.3: Usage Analytics Dashboard

**Objective:** Visualize filament consumption patterns

**Tasks:**

1. **Analytics Backend**

   ```typescript
   // server/services/analyticsService.ts
   async getFilamentUsageStats(
     userId: string,
     dateRange: { start: Date; end: Date }
   ): Promise<UsageStats> {
     // - Total filament used by material
     // - Cost per material
     // - Usage trends over time
     // - Most used filaments
   }
   ```

2. **Frontend Charts**
   - Material consumption pie chart
   - Usage over time line chart
   - Cost analysis table
   - Top 10 most used filaments

**Deliverables:**

- ✅ Analytics API
- ✅ Dashboard with charts
- ✅ Export functionality

---

### Phase 3: Advanced Intelligence (Week 4)

#### Step 3.1: Predictive Reordering

**Objective:** Suggest when to reorder filaments

**Tasks:**

1. **Consumption Rate Calculation**
   - Calculate average daily usage per filament
   - Project time until empty
   - Factor in print queue

2. **Low Inventory Alerts**
   - Pre-print warnings
   - Email notifications
   - Reorder suggestions

**Deliverables:**

- ✅ Predictive algorithm
- ✅ Alert system

---

## 🔐 Security & Compliance

### Security Measures (OWASP Top 10)

1. **Authentication & Authorization**
   - All endpoints verify user ownership
   - JWT token validation
   - Role-based access control

2. **Input Validation**
   - Zod schemas for all consumption data
   - Sanitize weight values (prevent negative, prevent overflow)
   - Validate AMS slot numbers (1-4)

3. **SQL Injection Prevention**
   - Drizzle ORM (parameterized queries)
   - No raw SQL string concatenation

4. **Audit Logging**
   - Log all automatic updates
   - Track corrections with reasons
   - User action audit trail

### GDPR Compliance

1. **Data Minimization**
   - Only store necessary consumption data
   - Allow user deletion of usage history

2. **Right to Erasure**
   - DELETE /api/filaments/usage/:id
   - Cascade delete on filament deletion

3. **Data Portability**
   - Export usage history (JSON/CSV)

---

## 🧪 Testing Strategy

### Unit Tests (80% Coverage Target)

```typescript
describe('FilamentService.recordAutomaticUsage', () => {
  it('should deduct weight correctly', () => {});
  it('should update status to empty when weight reaches 0', () => {});
  it('should update status to low when weight < 100g', () => {});
  it('should handle grouped spools correctly', () => {});
  it('should prevent negative weights', () => {});
  it('should create usage history record', () => {});
});

describe('PrintJobService.handlePrintCompletion', () => {
  it('should extract filament consumption from MQTT', () => {});
  it('should match AMS slots to filaments', () => {});
  it('should handle missing filament gracefully', () => {});
  it('should record usage for all filaments in multi-color print', () => {});
});
```

### Integration Tests

- Test full flow: MQTT → Parse → Match → Deduct → Update
- Test error scenarios (missing data, invalid values)
- Test multi-user scenarios (isolation)

### E2E Tests (Playwright)

- Complete print job flow
- Verify inventory updates
- Test correction interface

---

## 📊 Success Metrics

### Technical Metrics

- **Accuracy:** 99%+ correct filament deductions
- **Performance:** <500ms for inventory update
- **Reliability:** 99.9% success rate
- **Coverage:** 80%+ test coverage

### Business Metrics

- **Adoption:** 95% of users with automatic tracking enabled
- **Manual Intervention:** <1% of prints require manual updates
- **User Satisfaction:** Positive feedback on automation

---

## 🚀 Deployment Plan

### Pre-Deployment

1. ✅ Complete Phase 1 implementation
2. ✅ Achieve 80% test coverage
3. ✅ Security audit
4. ✅ Performance testing
5. ✅ User acceptance testing

### Deployment Steps

1. **Database Migration** (if schema changes needed)
2. **Backend Deployment** (zero-downtime)
3. **Frontend Deployment**
4. **Feature Flag** (gradual rollout)
5. **Monitoring** (error rates, performance)

### Rollback Plan

- Feature flag disable
- Database migration rollback (if needed)
- Version revert if critical issues

---

## 📝 Documentation Requirements

1. **API Documentation** (Swagger/OpenAPI)
2. **User Guide** (how automatic tracking works)
3. **Troubleshooting Guide** (common issues)
4. **Developer Guide** (extending the system)

---

## ✅ Definition of Done

Each phase is complete when:

- ✅ All tasks implemented
- ✅ Tests written and passing (80% coverage)
- ✅ Security review passed
- ✅ Documentation updated
- ✅ Code review approved
- ✅ No critical bugs
- ✅ Performance benchmarks met

---

## 🎯 Next Steps (Immediate)

1. **Research MQTT Print Completion Data**
   - Capture real MQTT messages from completed prints
   - Document filament consumption fields
   - Identify AMS slot data

2. **Create PrintJobService Foundation**
   - Basic class structure
   - Event handler setup
   - Integration with mqttService

3. **Extend FilamentService**
   - Add `recordAutomaticUsage()` method
   - Implement weight deduction logic
   - Add status auto-update

4. **Build Test Suite**
   - Unit tests for new methods
   - Mock MQTT data for integration tests

---

**Estimated Timeline:** 4 weeks for full implementation **Team Size:** 1-2 developers **Priority:**
High (core feature for user value)
