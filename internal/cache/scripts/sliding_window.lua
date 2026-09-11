local current_key = KEYS[1]
local previous_key = KEYS[2]

local max_requests = tonumber(ARGV[1])
local window_seconds = tonumber(ARGV[2])
local elapsed_seconds = tonumber(ARGV[3])

local prev_count =
    tonumber(redis.call('GET', previous_key) or '0')

local current_count =
    tonumber(redis.call('GET', current_key) or '0')

local elapsed_ratio = elapsed_seconds / window_seconds

local weighted_prev =
    prev_count * (1 - elapsed_ratio)

local estimated_before =
    weighted_prev + current_count

local reset_after = math.max(1, window_seconds - elapsed_seconds)

if estimated_before + 1 > max_requests then
    local used = math.ceil(estimated_before)
    local retry_after

    if prev_count > 0 then
        local target_elapsed = math.ceil(
            window_seconds *
            ((prev_count + current_count + 1 - max_requests) / prev_count)
        )
        retry_after = math.max(1, target_elapsed - elapsed_seconds)
    else
        local next_window_decay = math.ceil(
            window_seconds *
            ((current_count + 1 - max_requests) / current_count)
        )
        retry_after = reset_after + math.max(1, next_window_decay)
    end

    return { 0, used, 0, reset_after, retry_after }
end

local new_count = redis.call('INCR', current_key)

if new_count == 1 then
    redis.call('EXPIRE', current_key, window_seconds * 2)
end

local estimated_after = weighted_prev + new_count
local used = math.ceil(estimated_after)
local remaining = math.max(0, max_requests - used)

return { 1, used, remaining, reset_after, 0 }
