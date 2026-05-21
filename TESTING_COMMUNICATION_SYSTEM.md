# Communication System - Test Specification

## Test Overview
This document defines comprehensive test cases for the real-time communication system (comments, mentions, typing indicators).

---

## Test Environment Setup

### Prerequisites
- Two browser windows (or tabs) open to the application
- Two user accounts logged in
- A project with at least one task created
- Network traffic monitoring (optional, for socket events)

### Backend Health Check
```bash
# Verify Socket.io is running
curl http://localhost:3000/socket.io/?EIO=4&transport=polling

# Check comment endpoint
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/tasks/<taskId>/comments
```

---

## Test Cases

### TC-CM01: Create Comment
**Description:** User can create and submit a comment on a task

**Preconditions:**
- User is logged in
- Task detail panel is open
- User has comment input field visible

**Steps:**
1. Enter text in comment textarea: "Test comment"
2. Click Send button
3. Observe comment appears in list
4. Observe loading indicator shows during submission
5. Verify API call succeeds (check Network tab)

**Expected Results:**
- ✓ Comment textarea clears
- ✓ Comment appears in list with user avatar
- ✓ Comment timestamp is current
- ✓ Comment sender is correct user
- ✓ API returns 201 status

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM02: Comment with Attachment
**Description:** User can attach files to comments

**Preconditions:**
- User is logged in
- Task detail panel is open
- Test file available (PDF, DOC, JPG, etc.)

**Steps:**
1. Click attachment button (paperclip icon)
2. Select a file from local system (< 10MB)
3. Wait for upload to complete
4. Enter comment text
5. Click Send
6. Observe comment with attachment appears

**Expected Results:**
- ✓ File attachment shows in UI before submission
- ✓ Loading indicator during upload
- ✓ Attachment link appears in submitted comment
- ✓ User can click link to download file

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM03: Mention Autocomplete
**Description:** Typing @username triggers mention suggestions

**Preconditions:**
- User is logged in
- Task detail panel is open
- Multiple users in system

**Steps:**
1. Type "@j" in comment field
2. Observe autocomplete menu appears
3. Menu shows users with 'j' in name/email
4. Observe user avatars in suggestions
5. Click on suggested user
6. Observe mention inserted: "@John_Doe"
7. Continue typing rest of comment

**Expected Results:**
- ✓ Autocomplete appears within 100ms
- ✓ Suggestions are filtered correctly
- ✓ Avatar displays for each suggestion
- ✓ Click inserts mention correctly
- ✓ Text after @ is replaced with mention

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM04: Mention Parsing
**Description:** Backend correctly extracts and stores mentioned users

**Preconditions:**
- User is logged in
- Test user "John_Doe" exists in system

**Steps:**
1. Type comment: "Good work! @John_Doe check this"
2. Click Send
3. Open browser DevTools Network tab
4. Submit comment
5. Inspect request body for mentions
6. Check response comment data

**Expected Results:**
- ✓ Comment request includes: `"text": "Good work! @John_Doe check this"`
- ✓ Response includes `"mentions": [{ "_id": "...", "full_name": "John Doe", ... }]`
- ✓ No duplicate mentions if same user mentioned twice
- ✓ Invalid mentions are ignored

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM05: Mention Notification
**Description:** Mentioned users receive notifications

**Preconditions:**
- Two users logged in simultaneously
- User A and User B
- Task visible to both

**Steps:**
1. (User A) Type comment mentioning User B: "@UserB_Name"
2. (User A) Submit comment
3. (User B) Observe notification indicator (bell icon)
4. (User B) Check notification appears in notification panel
5. (User B) Verify notification title: "Được nhắc đến trong task"
6. (User B) Click notification, verifies link to task

**Expected Results:**
- ✓ Notification appears within 1 second
- ✓ Notification has user's avatar
- ✓ Notification title is correct
- ✓ Clicking navigates to correct task
- ✓ Notification links to correct comment

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM06: Typing Indicator Start
**Description:** Typing indicator shows when user starts typing

**Preconditions:**
- Two users logged in with task open
- User A in task detail panel
- User B in same task detail panel

**Steps:**
1. (User A) Click in comment textarea
2. (User A) Start typing: "H", wait 200ms
3. (User B) Observe indicator appears
4. Indicator shows: "User_A is typing..."
5. (User A) Continue typing message

**Expected Results:**
- ✓ Typing indicator appears within 500ms
- ✓ Indicator shows correct user name
- ✓ Animated dots show motion
- ✓ Multiple users typing shows all names
- ✓ Indicator doesn't interfere with comment composition

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM07: Typing Indicator Stop
**Description:** Typing indicator disappears when user stops typing

**Preconditions:**
- Typing indicator is showing for User A
- User B is observing

**Steps:**
1. (User A) Stop typing and blur (click away) from textarea
2. (User B) Observe typing indicator disappears
3. (User A) Type again
4. (User A) Wait 3+ seconds without typing
5. (User B) Observe indicator auto-hides

**Expected Results:**
- ✓ Indicator disappears immediately on blur
- ✓ Indicator auto-hides after 3 seconds of inactivity
- ✓ No "X is typing..." message after User A stops
- ✓ If User A types again, indicator reappears

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM08: Real-time Comment Broadcast
**Description:** New comments appear in real-time for all connected users

**Preconditions:**
- Two users logged in
- Both viewing same task
- Socket.io connection verified

**Steps:**
1. (User A) Type comment: "Test real-time"
2. (User A) Submit comment
3. (User B) Observe comment appears immediately
4. (User B) Verify sender is User A
5. (User B) Verify timestamp is current
6. (User B) Verify comment content is correct

**Expected Results:**
- ✓ Comment appears for User B within 500ms
- ✓ No page refresh needed
- ✓ Comment appears in chronological order
- ✓ All comment details (avatar, name, time) display correctly

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM09: Comment Persistence
**Description:** Comments are saved to database and persist on reload

**Preconditions:**
- Multiple comments created in task

**Steps:**
1. Observe comment list in task
2. Refresh page (F5)
3. Wait for task to reload
4. Verify all comments are still visible
5. Verify comments in same order as before
6. Close task detail panel
7. Reopen same task
8. Verify comments are still there

**Expected Results:**
- ✓ Comments load immediately on task open
- ✓ No duplicate comments on reload
- ✓ Comments in chronological order (oldest first)
- ✓ All comment data intact (text, attachments, mentions)

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM10: Multiple Mentions in One Comment
**Description:** Comment can mention multiple users

**Preconditions:**
- Multiple users in system
- Task visible to all users

**Steps:**
1. Type comment: "@John_Doe great work! @Jane_Smith please review"
2. Submit comment
3. Both John and Jane should receive notifications
4. Check API response for mentions array

**Expected Results:**
- ✓ Response mentions array has 2 entries
- ✓ Both mentioned users receive notifications
- ✓ No duplicate notifications
- ✓ Commenter is not notified for their own mention

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM11: Mention Highlight
**Description:** Mentioned users are highlighted in comment display

**Preconditions:**
- Comment with mentions exists
- Comment is visible in list

**Steps:**
1. Observe comment text in list
2. Look for mention highlighting (if implemented)
3. Verify @mentioned users are visually distinct

**Expected Results:**
- ✓ @mentions have different background color (optional UI enhancement)
- ✓ Mention text is easy to identify
- ✓ Highlighting doesn't interfere with readability

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM12: Socket Reconnection
**Description:** Typing indicators and comments work after socket reconnection

**Preconditions:**
- Socket connection established
- Users viewing task

**Steps:**
1. (User A) Open DevTools Network tab
2. Toggle offline/online mode
3. (User A) Wait for socket reconnection
4. (User B) Type comment
5. (User A) Observe comment appears
6. (User A) Start typing
7. (User B) Observe typing indicator

**Expected Results:**
- ✓ Socket reconnects automatically
- ✓ Comments still appear in real-time
- ✓ Typing indicators still work
- ✓ No manual page refresh needed
- ✓ No data loss

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM13: Performance - Many Comments
**Description:** System handles task with many comments (100+)

**Preconditions:**
- Task with 100+ comments created
- Slow network simulation (optional)

**Steps:**
1. Open task detail panel
2. Observe initial load time (target: < 2 seconds)
3. Scroll through comment list
4. Observe scrolling performance
5. Submit new comment
6. Observe response time

**Expected Results:**
- ✓ Initial load completes in < 2 seconds
- ✓ Scrolling is smooth (60fps)
- ✓ New comment appears within 500ms
- ✓ No lag or UI freezing

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM14: Error Handling - Failed Upload
**Description:** Graceful error handling for file upload failures

**Preconditions:**
- Network error simulation available
- File selected for attachment

**Steps:**
1. Select file for attachment
2. Simulate network error
3. Observe error message displayed
4. Verify file is not in attachment list
5. Try uploading different file
6. Verify upload succeeds

**Expected Results:**
- ✓ Error message is user-friendly
- ✓ "Retry" button appears (optional)
- ✓ Can select different file after error
- ✓ No orphaned attachment entries

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

### TC-CM15: Error Handling - Comment Submission Fails
**Description:** Graceful error handling when comment submission fails

**Preconditions:**
- Comment ready to submit
- Network error simulation available

**Steps:**
1. Type comment text
2. Simulate network error
3. Click Send
4. Observe error message
5. Text should remain in textarea
6. Attachments should remain
7. User can retry submission

**Expected Results:**
- ✓ Error message displayed
- ✓ Comment text is NOT cleared
- ✓ Attachments are NOT cleared
- ✓ User can retry without retyping
- ✓ After network restored, submit succeeds

**Actual Results:**
- [ ] Pass
- [ ] Fail (Issues: _____________)

---

## Regression Tests

### RG-01: Existing Task Functionality
**Description:** Ensure comment system doesn't break existing task features

**Steps:**
1. Create new task
2. Edit task fields (title, status, assignee, etc.)
3. Add subtasks
4. Submit task result
5. Review result (if manager)

**Expected Results:**
- ✓ All task operations work normally
- ✓ No conflicts with comment system
- ✓ Task sidebar still displays correctly

---

### RG-02: Other Notifications
**Description:** Ensure mention notifications don't interfere with other notifications

**Steps:**
1. Get task assignment notification
2. Get mention notification
3. Complete task and get review notification
4. Verify all notification types appear
5. Verify notification count is correct

**Expected Results:**
- ✓ All notification types display correctly
- ✓ No duplicate notifications
- ✓ Notification counts are accurate

---

## Performance Benchmarks

| Metric | Target | Actual |
|--------|--------|--------|
| Comment submission response time | < 500ms | |
| Comment broadcast to other clients | < 500ms | |
| Typing indicator emission | < 100ms | |
| File upload (5MB) | < 2s | |
| Initial comment load (50 comments) | < 1s | |
| Page reload with 100+ comments | < 2s | |
| Socket reconnection time | < 2s | |

---

## Test Sign-off

**Tested by:** _________________  
**Date:** _________________  
**Browser(s):** _________________  
**Notes:** _________________  

**Overall Result:**
- [ ] All tests passed
- [ ] Some tests failed (specify issues above)
- [ ] Blocked by infrastructure issues (specify below)

**Issues Found:**
```
1. 
2. 
3. 
```

**Ready for Production:** 
- [ ] Yes
- [ ] No (reason: _____________)

---

## Quick Test Checklist

For quick smoke testing:
- [ ] Create comment
- [ ] Add mention in comment  
- [ ] Receive mention notification
- [ ] See typing indicator
- [ ] Comment appears in real-time
- [ ] Refresh and comments persist
- [ ] File attachment uploads
- [ ] Multiple users see same comments
