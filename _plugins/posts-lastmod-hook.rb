#!/usr/bin/env ruby
#
# Check for changed posts

Jekyll::Hooks.register :posts, :post_init do |post|

  commit_num = `git rev-list --count HEAD "#{ post.path }"`

  if commit_num.to_i > 1
    lastmod_date = `git log -1 --pretty="%ad" --date=iso "#{ post.path }"`
    post.data['last_modified_at'] = lastmod_date
  end

  # Mark posts under locked folders, so templates can filter them out globally.
  post.data['protected_by_folder_lock'] = false

  lock_cfg = post.site.config['post_folder_lock']
  if lock_cfg && lock_cfg['enabled']
    post_path_down = post.path.to_s.downcase
    folders = lock_cfg['folders'] || []

    folders.each do |folder_item|
      folder_path = nil

      if folder_item.is_a?(Hash)
        folder_path = folder_item['path']
      else
        folder_path = folder_item
      end

      next if folder_path.nil? || folder_path.to_s.empty?

      if post_path_down.include?(folder_path.to_s.downcase)
        post.data['protected_by_folder_lock'] = true
        post.data['feed'] = false if post.data['feed'].nil?
        break
      end
    end
  end

end
